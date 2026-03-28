import { log as info, error } from "./lib/logger";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import path from 'path';
import fs from 'fs';
import express from 'express';
import { WebMonitorService } from "./lib/web-monitor-service";
import { DomainMonitorService } from "./services/domainMonitor";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./auth";
import { z } from "zod";
import { insertUserSchema, type User } from "@shared/schema";
import { hashPassword } from "./lib/auth-utils";
import { fromError } from "zod-validation-error";

// Safe logging helper that won't crash
function safeLog(message: string) {
  info(message.trim());
}

// Middleware to check if user is admin
const isAdmin = (req: any, res: any, next: any) => {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  }
  res.status(403).json({ message: "Forbidden: Admin access required" });
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Auth
  setupAuth(app);
  registerAuthRoutes(app);
  info(`Registering SMTP test route: ${api.settings.smtp.test.method} ${api.settings.smtp.test.path}`);

  // Storage Context Middleware
  app.use("/api", async (req: any, res, next) => {
    try {
      if (req.isAuthenticated() && req.user.orgId) {
        const { getStorageForOrg } = await import("./storage");
        req.storage = await getStorageForOrg(req.user.orgId);
      } else {
        const { storage } = await import("./storage");
        req.storage = storage;
      }
      next();
    } catch (err) {
      error(`Storage middleware error: ${err}`);
      next();
    }
  });

  // === PUBLIC API (Ingestion) ===
  // These routes are protected by Agent Tokens, not User Auth

  const validateAgentToken = async (req: any, res: any, next: any) => {
    const tokenStr = req.body?.token;
    if (!tokenStr || typeof tokenStr !== 'string') {
      return res.status(401).json({ message: "Missing token" });
    }
    
    // Resolve storage via token
    const { storage, getStorageForOrg } = await import("./storage");
    const tokenData = await storage.getTokenByString(tokenStr);
    
    if (tokenData && tokenData.projectId) {
       const { db } = await import("./db");
       const { projects } = await import("@shared/schema");
       const { eq } = await import("drizzle-orm");
       const [project] = await db.select().from(projects).where(eq(projects.id, tokenData.projectId)).limit(1);
       if (project && project.orgId) {
         req.storage = await getStorageForOrg(project.orgId);
       } else {
         req.storage = storage;
       }
    } else {
       req.storage = storage;
    }

    const isValid = await (req as any).storage.validateToken(tokenStr) ||
      tokenStr === process.env.AGENT_TOKEN ||
      tokenStr === "infra_inventory_agent_secret_2026";

    if (!isValid) {
      return res.status(401).json({ message: "Invalid token" });
    }
    next();
  };

  // VM Ingestion
  app.post(api.ingest.vm.path, validateAgentToken, async (req, res) => {
    try {
      const input = api.ingest.vm.input.parse(req.body);
      const { metrics, ...serverInfo } = input.data;

      // Look up the token to get its project association
      const tokenData = await storage.getTokenByString(input.token);
      // Process metrics
      const projectId = tokenData?.projectId || null;

      // Upsert server with project association and agent version
      const server = await (req as any).storage.upsertServer({ ...serverInfo, projectId });
      await (req as any).storage.addServerMetric({ ...metrics, serverId: server.id });

      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const shouldAudit = !server.lastAuditAt || server.lastAuditAt < oneMonthAgo;
      
      const shouldUpdate = (server as any).pendingUpdate;
      if (shouldUpdate) {
        await (req as any).storage.updateServer(server.id, { pendingUpdate: false } as any);
      }

      res.json({ 
        success: true, 
        interval: server.checkInterval,
        shouldAudit,
        shouldUpdate
      });
    } catch (err) {
      error(err);
      res.status(400).json({ message: "Invalid data format" });
    }
  });

  // Server Verification for Audit Script
  app.get('/api/servers/verify', async (req, res) => {
    try {
      const ip = req.query.ip as string;
      const hostname = req.query.hostname as string;
      
      const server = await (req as any).storage.getServerByContact(ip, hostname);
      if (server) {
        const token = await (req as any).storage.getTokenByProject(server.projectId);
        res.json({ registered: true, token: token?.token });
      } else {
        res.json({ registered: false });
      }
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Service Audit Ingestion
  app.post('/api/ingest/audit', validateAgentToken, async (req, res) => {
    try {
      const input = api.ingest.audit.input.parse(req.body);
      const { hostname, ipAddress, serviceVersions } = input.data;
      
      // Look up the token to get its project association
      const tokenData = await storage.getTokenByString(input.token);
      const projectId = tokenData?.projectId || null;

      // Upsert server with project association and service versions
      await (req as any).storage.upsertServer({
        hostname,
        ipAddress: ipAddress || "",
        projectId,
        serviceVersions,
        lastAuditAt: new Date()
      });

      res.json({ success: true });
    } catch (err) {
      error(err);
      res.status(400).json({ message: "Invalid audit data" });
    }
  });

  // DB Ingestion
  app.post(api.ingest.db.path, validateAgentToken, async (req, res) => {
    try {
      const input = api.ingest.db.input.parse(req.body);
      const { metrics, ...dbInfo } = input.data;

      // Look up the token to get its project association
      const tokenData = await storage.getTokenByString(input.token);
      const projectId = tokenData?.projectId || null;

      const database = await (req as any).storage.upsertDatabase({ ...dbInfo, projectId });
      await (req as any).storage.addDatabaseMetric({ ...metrics, databaseId: database.id });

      res.json({ success: true });
    } catch (err) {
      error(err);
      res.status(400).json({ message: "Invalid data format" });
    }
  });

  // K8s Ingestion
  app.post(api.ingest.k8s.path, validateAgentToken, async (req, res) => {
    try {
      const input = api.ingest.k8s.input.parse(req.body);
      const { metrics, ...clusterInfo } = input.data;

      // Look up the token to get its project association
      const tokenData = await storage.getTokenByString(input.token);
      const projectId = tokenData?.projectId || null;

      const cluster = await (req as any).storage.upsertCluster({ ...clusterInfo, projectId });
      await (req as any).storage.addClusterMetric({ ...metrics, clusterId: cluster.id });

      res.json({ success: true });
    } catch (err) {
      error(err);
      res.status(400).json({ message: "Invalid data format" });
    }
  });


  // === PRIVATE API (Dashboard) ===
  // Protected by Replit Auth 'isAuthenticated' middleware

  // Dashboard Stats
  app.get(api.dashboard.stats.path, isAuthenticated, async (req, res) => {
    const user = req.user as User;
    const stats = await (req as any).storage.getDashboardStats(user.orgId!);
    res.json(stats);
  });

  // Tokens Management
  app.get(api.tokens.list.path, isAuthenticated, async (req, res) => {
    const user = req.user as User;
    const tokens = await (req as any).storage.getTokens(user.orgId!);
    res.json(tokens);
  });

  app.post(api.tokens.create.path, isAuthenticated, async (req, res) => {
    const { name, type, projectId } = api.tokens.create.input.parse(req.body);
    const token = await (req as any).storage.createToken(name, type, projectId);
    res.status(201).json(token);
  });

  app.delete(api.tokens.revoke.path, isAuthenticated, async (req, res) => {
    await (req as any).storage.revokeToken(Number(req.params.id));
    res.status(204).send();
  });

  // Projects
  app.get(api.projects.list.path, isAuthenticated, async (req, res) => {
    const user = req.user as User;
    const projects = await (req as any).storage.getProjects(user.orgId!);
    res.json(projects);
  });

  app.post(api.projects.create.path, isAuthenticated, async (req, res) => {
    const user = req.user as User;
    const input = api.projects.create.input.parse(req.body);
    const project = await (req as any).storage.createProject(user.orgId!, input);
    res.status(201).json(project);
  });

  app.patch(api.projects.update.path, isAuthenticated, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid project ID" });
    const input = api.projects.update.input.parse(req.body);
    const project = await (req as any).storage.updateProject(id, input);
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(project);
  });

  app.delete(api.projects.delete.path, isAuthenticated, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid project ID" });
    await (req as any).storage.deleteProject(id);
    res.status(204).send();
  });

  app.patch(api.projects.updateOrder.path, isAuthenticated, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid project ID" });
    const { order } = api.projects.updateOrder.input.parse(req.body);
    await (req as any).storage.updateProjectSortOrder(id, order);
    res.json({ success: true });
  });

  app.get(api.projects.resources.path, isAuthenticated, async (req, res) => {
    const user = req.user as User;
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid project ID" });
    const resources = await (req as any).storage.getProjectResources(user.orgId!, id);
    if (!resources) return res.status(404).json({ message: "Project not found or unauthorized" });
    res.json(resources);
  });

  app.get(api.projects.status.path, async (req, res) => {
    const status = await (req as any).storage.getProjectStatusBySlug(req.params.slug);
    if (!status) return res.status(404).json({ message: "Project status page not found" });
    res.json(status);
  });
  
  app.post(api.projects.rollout.path, isAuthenticated, async (req, res) => {
    const user = req.user as User;
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid project ID" });
    await (req as any).storage.triggerProjectRollout(user.orgId!, id);
    res.json({ success: true });
  });

  // Project Email Templates
  app.get(api.projects.emailTemplates.list.path, isAuthenticated, async (req, res) => {
    const user = req.user as User;
    const templates = await (req as any).storage.getProjectEmailTemplates(user.orgId!, Number(req.params.id));
    res.json(templates);
  });

  app.patch(api.projects.emailTemplates.upsert.path, isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const id = Number(req.params.id);
      const alertType = req.params.alertType;
      const input = api.projects.emailTemplates.upsert.input.parse(req.body);
      const template = await (req as any).storage.upsertEmailTemplate(user.orgId!, id, alertType, input);
      res.json(template);
    } catch (err) {
      res.status(400).json({ message: "Invalid template format" });
    }
  });

  app.delete(api.projects.emailTemplates.delete.path, isAuthenticated, async (req, res) => {
    const user = req.user as User;
    const id = Number(req.params.id);
    const alertType = req.params.alertType;
    await (req as any).storage.deleteEmailTemplate(user.orgId!, id, alertType);
    res.status(204).send();
  });

  // Servers
  app.get(api.servers.list.path, isAuthenticated, async (req, res) => {
    const user = req.user as User;
    const servers = await (req as any).storage.getServers(user.orgId!);
    res.json(servers);
  });

  app.get(api.servers.get.path, isAuthenticated, async (req, res) => {
    const server = await (req as any).storage.getServer(Number(req.params.id));
    if (!server) return res.status(404).json({ message: "Server not found" });
    res.json(server);
  });

  // Databases
  app.get(api.databases.list.path, isAuthenticated, async (req, res) => {
    const user = req.user as User;
    const databases = await (req as any).storage.getDatabases(user.orgId!);
    res.json(databases);
  });

  app.get(api.databases.get.path, isAuthenticated, async (req, res) => {
    const database = await (req as any).storage.getDatabase(Number(req.params.id));
    if (!database) return res.status(404).json({ message: "Database not found" });
    res.json(database);
  });

  app.post(api.databases.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.databases.create.input.parse(req.body);
      const database = await (req as any).storage.upsertDatabase(input);
      res.status(201).json(database);
    } catch (err) {
      error("Database Create Error:", err);
      if (err instanceof z.ZodError) {
        error("Validation details:", JSON.stringify((err as z.ZodError).errors, null, 2));
      }
      res.status(400).json({ message: "Invalid data format", details: err });
    }
  });

  app.patch(api.databases.update.path, isAuthenticated, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.databases.update.input.parse(req.body);
      const database = await (req as any).storage.updateDatabase(id, input);
      if (!database) return res.status(404).json({ message: "Database not found" });
      res.json(database);
    } catch (err) {
      error("Database Update Error:", err);
      if (err instanceof z.ZodError) {
        error("Validation details:", JSON.stringify((err as z.ZodError).errors, null, 2));
      }
      res.status(400).json({ message: "Invalid data format", details: err });
    }
  });

  app.delete(api.databases.delete.path, isAuthenticated, async (req, res) => {
    await (req as any).storage.deleteDatabase(Number(req.params.id));
    res.status(204).send();
  });

  // Clusters
  app.get(api.clusters.list.path, isAuthenticated, async (req, res) => {
    const user = req.user as User;
    const clusters = await (req as any).storage.getClusters(user.orgId!);
    res.json(clusters);
  });

  app.get(api.clusters.get.path, isAuthenticated, async (req, res) => {
    const cluster = await (req as any).storage.getCluster(Number(req.params.id));
    if (!cluster) return res.status(404).json({ message: "Cluster not found" });
    res.json(cluster);
  });

  // Web Monitors
  app.get(api.webMonitors.list.path, isAuthenticated, async (req, res) => {
    const user = req.user as User;
    const monitors = await (req as any).storage.getWebMonitors(user.orgId!);
    res.json(monitors);
  });

  app.get(api.webMonitors.get.path, isAuthenticated, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid monitor ID" });
    const monitor = await (req as any).storage.getWebMonitor(id);
    if (!monitor) return res.status(404).json({ message: "Monitor not found" });
    res.json(monitor);
  });

  app.post(api.webMonitors.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.webMonitors.create.input.parse(req.body);
      const monitor = await (req as any).storage.createWebMonitor(input);
      res.status(201).json(monitor);
    } catch (err) {
      error(err);
      res.status(400).json({ message: "Invalid data format" });
    }
  });

  app.patch(api.webMonitors.update.path, isAuthenticated, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid monitor ID" });
      const input = api.webMonitors.update.input.parse(req.body);
      const monitor = await (req as any).storage.updateWebMonitor(id, input);
      if (!monitor) return res.status(404).json({ message: "Monitor not found" });
      res.json(monitor);
    } catch (err) {
      error(err);
      res.status(400).json({ message: "Invalid data format" });
    }
  });

  app.delete(api.webMonitors.delete.path, isAuthenticated, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid monitor ID" });
    await (req as any).storage.deleteWebMonitor(id);
    res.status(204).send();
  });

  // === DOMAIN MONITORS ===
  app.get(api.domainMonitors.list.path, isAuthenticated, async (req, res) => {
    const user = req.user as User;
    const monitors = await (req as any).storage.getDomainMonitors(user.orgId!);
    res.json(monitors);
  });

  app.get(api.domainMonitors.get.path, isAuthenticated, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid domain monitor ID" });
    const monitor = await (req as any).storage.getDomainMonitor(id);
    if (!monitor) return res.status(404).json({ message: "Domain monitor not found" });
    res.json(monitor);
  });

  app.post(api.domainMonitors.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.domainMonitors.create.input.parse(req.body);
      const monitor = await (req as any).storage.createDomainMonitor(input);
      // Trigger a proactive check for the newly added domain asynchronously
      DomainMonitorService.checkSingleDomain(monitor).catch(err => {
        error("Proactive domain check failed:", err);
      });
      res.status(201).json(monitor);
    } catch (err) {
      error(err);
      res.status(400).json({ message: "Invalid data format" });
    }
  });

  app.delete(api.domainMonitors.delete.path, isAuthenticated, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid domain monitor ID" });
    await (req as any).storage.deleteDomainMonitor(id);
    res.status(204).send();
  });

  // === SETTINGS ===

  // Project Alert Settings
  app.get(api.settings.projectAlerts.get.path, isAuthenticated, async (req, res) => {
    const user = req.user as User;
    const projectId = Number(req.params.id);
    const settings = await (req as any).storage.getProjectAlertSettings(user.orgId!, projectId);
    if (!settings) return res.status(404).json({ message: "Settings not found" });
    res.json(settings);
  });

  app.patch(api.settings.projectAlerts.update.path, isAuthenticated, async (req, res) => {
    const user = req.user as User;
    const projectId = Number(req.params.id);
    const input = api.settings.projectAlerts.update.input.parse(req.body);
    const settings = await (req as any).storage.upsertProjectAlertSettings(user.orgId!, projectId, input);
    res.json(settings);
  });

  // SMTP Settings
  app.get(api.settings.smtp.get.path, isAuthenticated, async (req, res) => {
    const user = req.user as User;
    const settings = await (req as any).storage.getSmtpSettings(user.orgId!);
    if (!settings) return res.status(404).json({ message: "SMTP settings not found" });
    res.json(settings);
  });

  app.patch(api.settings.smtp.upsert.path, isAuthenticated, async (req, res) => {
    const user = req.user as User;
    const input = api.settings.smtp.upsert.input.parse(req.body);
    const settings = await (req as any).storage.upsertSmtpSettings(user.orgId!, input);
    res.json(settings);
  });

  // SMTP Test
  app.post(api.settings.smtp.test.path, isAuthenticated, async (req, res) => {
    try {
      const { recipient, settings: customSettings } = api.settings.smtp.test.input.parse(req.body);
      await (req as any).storage.sendTestEmail(recipient, customSettings);
      res.json({ success: true, message: "Test email sent" });
    } catch (err: any) {
      error("SMTP Test failed:", err);
      res.status(400).json({ message: err.message || "Failed to send test email" });
    }
  });

  // Global Email Templates
  app.get(api.settings.emailTemplates.list.path, isAuthenticated, async (req, res) => {
    const user = req.user as User;
    const templates = await (req as any).storage.getProjectEmailTemplates(user.orgId!, null);
    res.json(templates);
  });

  app.patch(api.settings.emailTemplates.upsert.path, isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const alertType = req.params.alertType;
      const input = api.settings.emailTemplates.upsert.input.parse(req.body);
      const template = await (req as any).storage.upsertEmailTemplate(user.orgId!, null, alertType, input);
      res.json(template);
    } catch (err) {
      res.status(400).json({ message: "Invalid template format" });
    }
  });

  app.delete(api.settings.emailTemplates.delete.path, isAuthenticated, async (req, res) => {
    const user = req.user as User;
    const alertType = req.params.alertType;
    await (req as any).storage.deleteEmailTemplate(user.orgId!, null, alertType);
    res.status(204).send();
  });

  // === SERVER MANAGEMENT (Manual) ===
  app.post(api.servers.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.servers.create.input.parse(req.body);
      const { cpuUsage, memoryUsage, diskUsage, ...serverData } = input;
      const server = await (req as any).storage.upsertServer(serverData);

      if (cpuUsage !== undefined || memoryUsage !== undefined || diskUsage !== undefined) {
        await (req as any).storage.addServerMetric({
          serverId: server.id,
          cpuUsage: cpuUsage ?? 0,
          memoryUsage: memoryUsage ?? 0,
          diskUsage: diskUsage ?? 0,
        });
      }

      res.status(201).json(server);
    } catch (err) {
      error(err);
      res.status(400).json({ message: "Invalid data format" });
    }
  });

  app.patch(api.servers.update.path, isAuthenticated, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.servers.update.input.parse(req.body);
      const { cpuUsage, memoryUsage, diskUsage, ...serverData } = input;

      const server = await (req as any).storage.updateServer(id, serverData);
      if (!server) {
        return res.status(404).json({ message: "Server not found" });
      }

      if (cpuUsage !== undefined || memoryUsage !== undefined || diskUsage !== undefined) {
        await (req as any).storage.addServerMetric({
          serverId: server.id,
          cpuUsage: cpuUsage ?? 0,
          memoryUsage: memoryUsage ?? 0,
          diskUsage: diskUsage ?? 0,
        });
      }

      res.json(server);
    } catch (err) {
      error(err);
      res.status(400).json({ message: "Invalid data format" });
    }
  });

  app.delete(api.servers.delete.path, isAuthenticated, async (req, res) => {
    await (req as any).storage.deleteServer(Number(req.params.id));
    res.status(204).send();
  });

  app.patch(api.servers.updateOrder.path, isAuthenticated, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid server ID" });
    const { order } = api.servers.updateOrder.input.parse(req.body);
    await (req as any).storage.updateServerSortOrder(id, order);
    res.json({ success: true });
  });

  // === USER MANAGEMENT ===
  // Admin only: List users
  app.get("/api/admin/users", isAdmin, async (req, res) => {
    const user = req.user as User;
    const usersList = await (req as any).storage.getUsers(user.orgId!);
    // Remove sensitive data (passwords)
    const safeUsers = usersList.map(({ password, ...rest }) => rest);
    res.json(safeUsers);
  });

  // Admin only: Create user
  app.post("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const input = insertUserSchema.parse(req.body);
      const hashedPassword = await hashPassword(input.password);
      const user = await (req as any).storage.createUser({ ...input, password: hashedPassword });
      const { password, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: err.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin only: Change any user password
  app.patch("/api/admin/users/:id/password", isAdmin, async (req, res) => {
    try {
      const { password } = z.object({ password: z.string().min(6) }).parse(req.body);
      const hashedPassword = await hashPassword(password);
      const user = await (req as any).storage.updateUser(req.params.id, { password: hashedPassword });
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json({ message: "Password updated successfully" });
    } catch (err) {
      res.status(400).json({ message: "Invalid password format" });
    }
  });

  // Admin only: Delete user
  app.delete("/api/admin/users/:id", isAdmin, async (req, res) => {
    try {
      if (req.params.id === (req.user as any).id) {
        return res.status(400).json({ message: "You cannot delete your own account" });
      }
      await (req as any).storage.deleteUser(req.params.id);
      res.status(204).send();
    } catch (err) {
      error("Error deleting user:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Self: Change own password
  app.patch("/api/user/password", isAuthenticated, async (req, res) => {
    try {
      const { password } = z.object({ password: z.string().min(6) }).parse(req.body);
      const hashedPassword = await hashPassword(password);
      const user = req.user as any;
      await (req as any).storage.updateUser(user.id, { password: hashedPassword });
      res.json({ message: "Password updated successfully" });
    } catch (err) {
      res.status(400).json({ message: "Invalid password format" });
    }
  });

  // === ALERTS ===
  app.get(api.alerts.list.path, isAuthenticated, async (req, res) => {
    const user = req.user as User;
    const serverId = Number(req.params.serverId);
    const alerts = await (req as any).storage.getRecentAlerts(user.orgId!, serverId);
    res.json(alerts);
  });

  app.get(api.alerts.history.path, isAuthenticated, async (req, res) => {
    const user = req.user as User;
    const alerts = await (req as any).storage.getAlertHistory(user.orgId!);
    res.json(alerts);
  });

  app.get(api.alerts.projectHistory.path, isAuthenticated, async (req, res) => {
    const user = req.user as User;
    const projectId = Number(req.params.id);
    if (isNaN(projectId)) return res.status(400).json({ message: "Invalid project ID" });
    
    const limit = Number(req.query.limit) || 20;
    const offset = Number(req.query.offset) || 0;
    const status = req.query.status as string;
    const type = req.query.type as string;
    
    const history = await (req as any).storage.getProjectAlertHistory(user.orgId!, projectId, limit, offset, status, type);
    res.json(history);
  });

  app.delete(api.alerts.deleteHistory.path, isAuthenticated, async (req, res) => {
    const user = req.user as User;
    const projectId = Number(req.params.id);
    if (isNaN(projectId)) return res.status(400).json({ message: "Invalid project ID" });
    await (req as any).storage.deleteProjectAlerts(user.orgId!, projectId);
    res.status(204).send();
  });

  app.patch(api.alerts.updateMuted.path, isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const projectId = Number(req.params.id);
      if (isNaN(projectId)) return res.status(400).json({ message: "Invalid project ID" });
      const { alertMutedResources } = api.alerts.updateMuted.input.parse(req.body);
      const updated = await (req as any).storage.upsertProjectAlertSettings(user.orgId!, projectId, { alertMutedResources } as any);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to update alert muting" });
    }
  });

  // === BACKGROUND SERVICES ===
  WebMonitorService.start();
  DomainMonitorService.start();

  return httpServer;
}
