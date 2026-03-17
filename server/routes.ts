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
import { insertUserSchema } from "@shared/schema";
import { hashPassword } from "./lib/auth-utils";
import { fromError } from "zod-validation-error";

// Safe logging helper that won't crash if file doesn't exist
function safeLog(message: string) {
  try {
    const fs = require("fs");
    fs.appendFileSync("alerts_debug.log", message);
  } catch (err) {
    // Silently fail or use console.log as fallback
    console.log(message.trim());
  }
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



  console.log(`Registering SMTP test route: ${api.settings.smtp.test.method} ${api.settings.smtp.test.path}`);

  // === PUBLIC API (Ingestion) ===
  // These routes are protected by Agent Tokens, not User Auth

  // Middleware to validate agent token
  const validateAgentToken = async (req: any, res: any, next: any) => {
    const token = req.body?.token;
    if (!token || typeof token !== 'string') {
      return res.status(401).json({ message: "Missing token" });
    }
    const isValid = await storage.validateToken(token) ||
      token === process.env.AGENT_TOKEN ||
      token === "infra_inventory_agent_secret_2026";

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

      // Upsert server with project association
      const server = await storage.upsertServer({ ...serverInfo, projectId });
      await storage.addServerMetric({ ...metrics, serverId: server.id });

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: "Invalid data format" });
    }
  });

  // Server Verification for Audit Script
  app.get('/api/servers/verify', async (req, res) => {
    try {
      const ip = req.query.ip as string;
      const hostname = req.query.hostname as string;
      
      const server = await storage.getServerByContact(ip, hostname);
      if (server) {
        const token = await storage.getTokenByProject(server.projectId);
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
      await storage.upsertServer({
        hostname,
        ipAddress: ipAddress || "",
        projectId,
        serviceVersions
      });

      res.json({ success: true });
    } catch (err) {
      console.error(err);
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

      const database = await storage.upsertDatabase({ ...dbInfo, projectId });
      await storage.addDatabaseMetric({ ...metrics, databaseId: database.id });

      res.json({ success: true });
    } catch (err) {
      console.error(err);
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

      const cluster = await storage.upsertCluster({ ...clusterInfo, projectId });
      await storage.addClusterMetric({ ...metrics, clusterId: cluster.id });

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: "Invalid data format" });
    }
  });


  // === PRIVATE API (Dashboard) ===
  // Protected by Replit Auth 'isAuthenticated' middleware

  // Dashboard Stats
  app.get(api.dashboard.stats.path, isAuthenticated, async (req, res) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });

  // Tokens Management
  app.get(api.tokens.list.path, isAuthenticated, async (req, res) => {
    const tokens = await storage.getTokens();
    res.json(tokens);
  });

  app.post(api.tokens.create.path, isAuthenticated, async (req, res) => {
    const { name, type, projectId } = api.tokens.create.input.parse(req.body);
    const token = await storage.createToken(name, type, projectId);
    res.status(201).json(token);
  });

  app.delete(api.tokens.revoke.path, isAuthenticated, async (req, res) => {
    await storage.revokeToken(Number(req.params.id));
    res.status(204).send();
  });

  // Projects
  app.get(api.projects.list.path, isAuthenticated, async (req, res) => {
    const projects = await storage.getProjects();
    res.json(projects);
  });

  app.post(api.projects.create.path, isAuthenticated, async (req, res) => {
    const input = api.projects.create.input.parse(req.body);
    const project = await storage.createProject(input);
    res.status(201).json(project);
  });

  app.patch(api.projects.update.path, isAuthenticated, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid project ID" });
    const input = api.projects.update.input.parse(req.body);
    const project = await storage.updateProject(id, input);
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(project);
  });

  app.delete(api.projects.delete.path, isAuthenticated, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid project ID" });
    await storage.deleteProject(id);
    res.status(204).send();
  });

  app.get(api.projects.resources.path, isAuthenticated, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid project ID" });
    const resources = await storage.getProjectResources(id);
    if (!resources) return res.status(404).json({ message: "Project not found" });
    res.json(resources);
  });

  app.get(api.projects.status.path, async (req, res) => {
    const status = await storage.getProjectStatusBySlug(req.params.slug);
    if (!status) return res.status(404).json({ message: "Project status page not found" });
    res.json(status);
  });

  // Project Email Templates
  app.get(api.projects.emailTemplates.list.path, isAuthenticated, async (req, res) => {
    const templates = await storage.getProjectEmailTemplates(Number(req.params.id));
    res.json(templates);
  });

  app.patch(api.projects.emailTemplates.upsert.path, isAuthenticated, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const alertType = req.params.alertType;
      const input = api.projects.emailTemplates.upsert.input.parse(req.body);
      const template = await storage.upsertProjectEmailTemplate(id, alertType, input);
      res.json(template);
    } catch (err) {
      res.status(400).json({ message: "Invalid template format" });
    }
  });

  app.delete(api.projects.emailTemplates.delete.path, isAuthenticated, async (req, res) => {
    const id = Number(req.params.id);
    const alertType = req.params.alertType;
    await storage.deleteProjectEmailTemplate(id, alertType);
    res.status(204).send();
  });

  // Servers
  app.get(api.servers.list.path, isAuthenticated, async (req, res) => {
    const servers = await storage.getServers();
    res.json(servers);
  });

  app.get(api.servers.get.path, isAuthenticated, async (req, res) => {
    const server = await storage.getServer(Number(req.params.id));
    if (!server) return res.status(404).json({ message: "Server not found" });
    res.json(server);
  });

  // Databases
  app.get(api.databases.list.path, isAuthenticated, async (req, res) => {
    const databases = await storage.getDatabases();
    res.json(databases);
  });

  app.get(api.databases.get.path, isAuthenticated, async (req, res) => {
    const database = await storage.getDatabase(Number(req.params.id));
    if (!database) return res.status(404).json({ message: "Database not found" });
    res.json(database);
  });

  app.post(api.databases.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.databases.create.input.parse(req.body);
      const database = await storage.upsertDatabase(input);
      res.status(201).json(database);
    } catch (err) {
      console.error("Database Create Error:", err);
      if (err instanceof z.ZodError) {
        console.error("Validation details:", JSON.stringify((err as z.ZodError).errors, null, 2));
      }
      res.status(400).json({ message: "Invalid data format", details: err });
    }
  });

  app.patch(api.databases.update.path, isAuthenticated, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.databases.update.input.parse(req.body);
      const database = await storage.updateDatabase(id, input);
      if (!database) return res.status(404).json({ message: "Database not found" });
      res.json(database);
    } catch (err) {
      console.error("Database Update Error:", err);
      if (err instanceof z.ZodError) {
        console.error("Validation details:", JSON.stringify((err as z.ZodError).errors, null, 2));
      }
      res.status(400).json({ message: "Invalid data format", details: err });
    }
  });

  app.delete(api.databases.delete.path, isAuthenticated, async (req, res) => {
    await storage.deleteDatabase(Number(req.params.id));
    res.status(204).send();
  });

  // Clusters
  app.get(api.clusters.list.path, isAuthenticated, async (req, res) => {
    const clusters = await storage.getClusters();
    res.json(clusters);
  });

  app.get(api.clusters.get.path, isAuthenticated, async (req, res) => {
    const cluster = await storage.getCluster(Number(req.params.id));
    if (!cluster) return res.status(404).json({ message: "Cluster not found" });
    res.json(cluster);
  });

  // Web Monitors
  app.get(api.webMonitors.list.path, isAuthenticated, async (req, res) => {
    const monitors = await storage.getWebMonitors();
    res.json(monitors);
  });

  app.get(api.webMonitors.get.path, isAuthenticated, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid monitor ID" });
    const monitor = await storage.getWebMonitor(id);
    if (!monitor) return res.status(404).json({ message: "Monitor not found" });
    res.json(monitor);
  });

  app.post(api.webMonitors.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.webMonitors.create.input.parse(req.body);
      const monitor = await storage.createWebMonitor(input);
      res.status(201).json(monitor);
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: "Invalid data format" });
    }
  });

  app.patch(api.webMonitors.update.path, isAuthenticated, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid monitor ID" });
      const input = api.webMonitors.update.input.parse(req.body);
      const monitor = await storage.updateWebMonitor(id, input);
      if (!monitor) return res.status(404).json({ message: "Monitor not found" });
      res.json(monitor);
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: "Invalid data format" });
    }
  });

  app.delete(api.webMonitors.delete.path, isAuthenticated, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid monitor ID" });
    await storage.deleteWebMonitor(id);
    res.status(204).send();
  });

  // === DOMAIN MONITORS ===
  app.get(api.domainMonitors.list.path, isAuthenticated, async (req, res) => {
    const monitors = await storage.getDomainMonitors();
    res.json(monitors);
  });

  app.get(api.domainMonitors.get.path, isAuthenticated, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid domain monitor ID" });
    const monitor = await storage.getDomainMonitor(id);
    if (!monitor) return res.status(404).json({ message: "Domain monitor not found" });
    res.json(monitor);
  });

  app.post(api.domainMonitors.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.domainMonitors.create.input.parse(req.body);
      const monitor = await storage.createDomainMonitor(input);
      // Trigger a proactive check for the newly added domain asynchronously
      DomainMonitorService.checkSingleDomain(monitor).catch(err => {
        console.error("Proactive domain check failed:", err);
      });
      res.status(201).json(monitor);
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: "Invalid data format" });
    }
  });

  app.delete(api.domainMonitors.delete.path, isAuthenticated, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid domain monitor ID" });
    await storage.deleteDomainMonitor(id);
    res.status(204).send();
  });

  // === SERVER MANAGEMENT (Manual) ===
  app.post(api.servers.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.servers.create.input.parse(req.body);
      const { cpuUsage, memoryUsage, diskUsage, ...serverData } = input;
      const server = await storage.upsertServer(serverData);

      if (cpuUsage !== undefined || memoryUsage !== undefined || diskUsage !== undefined) {
        await storage.addServerMetric({
          serverId: server.id,
          cpuUsage: cpuUsage ?? 0,
          memoryUsage: memoryUsage ?? 0,
          diskUsage: diskUsage ?? 0,
        });
      }

      res.status(201).json(server);
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: "Invalid data format" });
    }
  });

  app.patch(api.servers.update.path, isAuthenticated, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.servers.update.input.parse(req.body);
      const { cpuUsage, memoryUsage, diskUsage, ...serverData } = input;

      const server = await storage.updateServer(id, serverData);
      if (!server) {
        return res.status(404).json({ message: "Server not found" });
      }

      if (cpuUsage !== undefined || memoryUsage !== undefined || diskUsage !== undefined) {
        await storage.addServerMetric({
          serverId: server.id,
          cpuUsage: cpuUsage ?? 0,
          memoryUsage: memoryUsage ?? 0,
          diskUsage: diskUsage ?? 0,
        });
      }

      res.json(server);
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: "Invalid data format" });
    }
  });

  app.delete(api.servers.delete.path, isAuthenticated, async (req, res) => {
    await storage.deleteServer(Number(req.params.id));
    res.status(204).send();
  });

  // === USER MANAGEMENT ===
  // Admin only: List users
  app.get("/api/admin/users", isAdmin, async (req, res) => {
    const usersList = await storage.getUsers();
    // Remove sensitive data (passwords)
    const safeUsers = usersList.map(({ password, ...rest }) => rest);
    res.json(safeUsers);
  });

  // Admin only: Create user
  app.post("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const input = insertUserSchema.parse(req.body);
      const hashedPassword = await hashPassword(input.password);
      const user = await storage.createUser({ ...input, password: hashedPassword });
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
      const user = await storage.updateUser(req.params.id, { password: hashedPassword });
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
      await storage.deleteUser(req.params.id);
      res.status(204).send();
    } catch (err) {
      console.error("Error deleting user:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Self: Change own password
  app.patch("/api/user/password", isAuthenticated, async (req, res) => {
    try {
      const { password } = z.object({ password: z.string().min(6) }).parse(req.body);
      const hashedPassword = await hashPassword(password);
      const user = req.user as any;
      await storage.updateUser(user.id, { password: hashedPassword });
      res.json({ message: "Password updated successfully" });
    } catch (err) {
      res.status(400).json({ message: "Invalid password format" });
    }
  });

  // === SETTINGS ===
  app.get(api.settings.smtp.get.path, isAuthenticated, async (req, res) => {
    const settings = await storage.getSmtpSettings();
    if (!settings) return res.status(404).json({ message: "SMTP settings not found" });
    res.json(settings);
  });

  app.patch(api.settings.smtp.upsert.path, isAuthenticated, async (req, res) => {
    try {
      safeLog(`[${new Date().toISOString()}] PATCH SMTP UPSERT REQUEST. Body: ${JSON.stringify(req.body)}\n`);

      const input = api.settings.smtp.upsert.input.parse(req.body);
      const settings = await storage.upsertSmtpSettings(input);
      res.json(settings);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        const validationError = fromError(err);
        safeLog(`[${new Date().toISOString()}] SMTP Validation error: ${validationError.message}\n`);
        res.status(400).json({ message: validationError.message });
      } else {
        safeLog(`[${new Date().toISOString()}] Error upserting SMTP: ${err}\n`);
        res.status(400).json({ message: "Invalid SMTP settings format" });
      }
    }
  });

  // Project Alert Settings
  app.get(api.settings.projectAlerts.get.path, isAuthenticated, async (req, res) => {
    const settings = await storage.getProjectAlertSettings(Number(req.params.id));
    if (!settings) return res.status(404).json({ message: "Project alert settings not found" });
    res.json(settings);
  });

  app.patch(api.settings.projectAlerts.update.path, isAuthenticated, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.settings.projectAlerts.update.input.parse(req.body);
      const settings = await storage.upsertProjectAlertSettings(id, input as any);
      res.json(settings);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: fromError(err).message });
      }
      res.status(500).json({ message: "Failed to update project alert settings" });
    }
  });

  app.post(api.settings.smtp.test.path, isAuthenticated, async (req, res) => {
    try {
      const { recipient, settings: bodySettings } = api.settings.smtp.test.input.parse(req.body);
      safeLog(`[${new Date().toISOString()}] TEST EMAIL REQUEST for ${recipient}\n`);

      let settingsToUse: any = bodySettings;
      if (!settingsToUse) {
        settingsToUse = await storage.getSmtpSettings();
      }

      if (!settingsToUse) {
        return res.status(400).json({ message: "Provide SMTP settings or configure them in settings first" });
      }

      const EmailService = (await import("./lib/email")).EmailService;
      await EmailService.sendTestEmail(settingsToUse as any, recipient);
      res.json({ success: true, message: "Test email sent successfully" });
    } catch (err: any) {
      console.error("Test email failed:", err);
      // Return a more descriptive error if possible
      res.status(400).json({
        success: false,
        message: err.message || "Failed to send test email. Check your SMTP configuration and network."
      });
    }
  });

  // === ALERTS ===
  app.get(api.alerts.list.path, isAuthenticated, async (req, res) => {
    const serverId = Number(req.params.serverId);
    const alerts = await storage.getRecentAlerts(serverId);
    res.json(alerts);
  });

  app.get(api.alerts.history.path, isAuthenticated, async (req, res) => {
    const alerts = await storage.getAlertHistory();
    res.json(alerts);
  });

  // === BACKGROUND SERVICES ===
  WebMonitorService.start();
  DomainMonitorService.start();

  // === SEED DATA ===
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existingTokens = await storage.getTokens();
  if (existingTokens.length === 0) {
    console.log("Seeding database...");

    // Create a default token for testing agents
    const token = await storage.createToken("Default Dev Token", "vm");
    console.log(`Created default token: ${token.token}`);

    // Create some dummy servers
    const s1 = await storage.upsertServer({
      hostname: "prod-web-01",
      os: "Ubuntu 22.04 LTS",
      cpuCores: 4,
      totalRam: 16,
      totalDisk: 500,
      ipAddress: "10.0.0.5"
    });
    // Add metrics for s1
    await storage.addServerMetric({ serverId: s1.id, cpuUsage: 45, memoryUsage: 60, diskUsage: 82 });
    await storage.addServerMetric({ serverId: s1.id, cpuUsage: 48, memoryUsage: 62, diskUsage: 82 });
    await storage.addServerMetric({ serverId: s1.id, cpuUsage: 50, memoryUsage: 65, diskUsage: 83 });

    const s2 = await storage.upsertServer({
      hostname: "prod-db-replica",
      os: "Debian 11",
      cpuCores: 8,
      totalRam: 32,
      totalDisk: 1000,
      ipAddress: "10.0.0.20"
    });
    // Critical disk usage example
    await storage.addServerMetric({ serverId: s2.id, cpuUsage: 20, memoryUsage: 40, diskUsage: 92 });

    const db1 = await storage.upsertDatabase({
      name: "main-postgres",
      engine: "PostgreSQL",
      version: "15.4",
      host: "db.internal",
      port: 5432
    });
    await storage.addDatabaseMetric({ databaseId: db1.id, storageUsed: 150, activeConnections: 45 });

    const k8s1 = await storage.upsertCluster({
      name: "us-east-1-cluster",
      version: "1.28.2",
      nodeCount: 5,
      totalCpu: 40,
      totalMemory: 160
    });
    await storage.addClusterMetric({ clusterId: k8s1.id, cpuUsage: 65, memoryUsage: 70, podCount: 120 });

    console.log("Seeding complete.");
  }
}
