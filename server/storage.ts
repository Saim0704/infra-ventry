import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import {
  users, tokens, servers, serverMetrics, databases, databaseMetrics, clusters, clusterMetrics, projects,
  smtpSettings, alerts, projectAlertSettings, webMonitors, webMonitorMetrics, domainMonitors, projectEmailTemplates,
  type User, type Token, type Server, type ServerMetric, type Database, type DatabaseMetric, type Cluster, type ClusterMetric, type Project,
  type SmtpSettings, type Alert, type ProjectAlertSettings, type WebMonitor, type WebMonitorMetric, type DomainMonitor, type DomainMonitorUpdate,
  type ProjectEmailTemplate, type InsertProjectEmailTemplate
} from "@shared/schema";
import {
  insertTokenSchema, insertServerSchema, insertServerMetricSchema, insertDatabaseSchema,
  insertDatabaseMetricSchema, insertClusterSchema, insertClusterMetricSchema, insertProjectSchema,
  insertUserSchema, insertSmtpSettingsSchema, insertProjectAlertSettingsSchema,
  insertWebMonitorSchema, insertWebMonitorMetricSchema, insertDomainMonitorSchema,
} from "@shared/schema";
import { EmailService } from "./lib/email";
import { z } from "zod";

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

export interface IStorage {
  // === TOKENS ===
  getTokens(projectId?: number | null): Promise<Token[]>;
  getTokenByString(tokenStr: string): Promise<Token | undefined>;
  createToken(name: string, type: string, projectId?: number | null): Promise<Token>;
  validateToken(token: string): Promise<boolean>;
  revokeToken(id: number): Promise<void>;

  // === STATS ===
  getDashboardStats(): Promise<{
    totalServers: number;
    totalDatabases: number;
    totalClusters: number;
    healthyServers: number;
    criticalServers: number;
  }>;

  getProjects(): Promise<Project[]>;
  getProjectStatusBySlug(slug: string): Promise<any | null>;
  createProject(data: z.infer<typeof insertProjectSchema>): Promise<Project>;
  deleteProject(id: number): Promise<void>;

  // === SERVERS ===
  getServers(): Promise<(Server & { metrics: ServerMetric[] })[]>;
  getServer(id: number): Promise<(Server & { metrics: ServerMetric[] }) | undefined>;
  upsertServer(data: z.infer<typeof insertServerSchema>): Promise<Server>;
  updateServer(id: number, data: Partial<z.infer<typeof insertServerSchema>>): Promise<Server | undefined>;
  deleteServer(id: number): Promise<void>;
  addServerMetric(data: z.infer<typeof insertServerMetricSchema>): Promise<void>;

  // === DATABASES ===
  getDatabases(): Promise<(Database & { metrics: DatabaseMetric[], project?: Project })[]>;
  getDatabase(id: number): Promise<(Database & { metrics: DatabaseMetric[] }) | undefined>;
  upsertDatabase(data: z.infer<typeof insertDatabaseSchema>): Promise<Database>;
  updateDatabase(id: number, data: Partial<z.infer<typeof insertDatabaseSchema>>): Promise<Database | undefined>;
  deleteDatabase(id: number): Promise<void>;
  addDatabaseMetric(data: z.infer<typeof insertDatabaseMetricSchema>): Promise<void>;

  // === CLUSTERS ===
  getClusters(): Promise<Cluster[]>;
  getCluster(id: number): Promise<(Cluster & { metrics: ClusterMetric[] }) | undefined>;
  upsertCluster(data: z.infer<typeof insertClusterSchema>): Promise<Cluster>;
  addClusterMetric(data: z.infer<typeof insertClusterMetricSchema>): Promise<void>;

  // === WEB MONITORS ===
  getWebMonitors(): Promise<(WebMonitor & { metrics: WebMonitorMetric[], project?: Project })[]>;
  getWebMonitor(id: number): Promise<(WebMonitor & { metrics: WebMonitorMetric[] }) | undefined>;
  createWebMonitor(data: z.infer<typeof insertWebMonitorSchema>): Promise<WebMonitor>;
  updateWebMonitor(id: number, data: Partial<z.infer<typeof insertWebMonitorSchema>>): Promise<WebMonitor | undefined>;
  deleteWebMonitor(id: number): Promise<void>;
  addWebMonitorMetric(data: z.infer<typeof insertWebMonitorMetricSchema>): Promise<void>;

  // === DOMAIN MONITORS ===
  getDomainMonitors(): Promise<(DomainMonitor & { project?: Project })[]>;
  getDomainMonitor(id: number): Promise<(DomainMonitor & { project?: Project }) | undefined>;
  createDomainMonitor(data: z.infer<typeof insertDomainMonitorSchema>): Promise<DomainMonitor>;
  updateDomainMonitor(id: number, data: DomainMonitorUpdate): Promise<DomainMonitor | undefined>;
  deleteDomainMonitor(id: number): Promise<void>;

  // === USERS ===
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  createUser(data: z.infer<typeof insertUserSchema>): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;

  // === SETTINGS ===
  getSmtpSettings(): Promise<SmtpSettings | undefined>;
  upsertSmtpSettings(data: z.infer<typeof insertSmtpSettingsSchema>): Promise<SmtpSettings>;

  // === PROJECT ALERT SETTINGS ===
  getProjectAlertSettings(projectId: number): Promise<ProjectAlertSettings | undefined>;
  upsertProjectAlertSettings(projectId: number, data: Partial<z.infer<typeof insertProjectAlertSettingsSchema>>): Promise<ProjectAlertSettings>;

  // === ALERTS ===
  getRecentAlerts(serverId: number): Promise<Alert[]>;
  getAlertHistory(): Promise<(Alert & { serverName: string })[]>;
  createAlert(data: { serverId?: number, databaseId?: number, clusterId?: number, webMonitorId?: number, type: string, value: number, threshold: number }): Promise<void>;

  // === PROJECT EMAIL TEMPLATES ===
  getProjectEmailTemplates(projectId: number): Promise<ProjectEmailTemplate[]>;
  upsertProjectEmailTemplate(projectId: number, alertType: string, data: { subject: string, body: string }): Promise<ProjectEmailTemplate>;
  deleteProjectEmailTemplate(projectId: number, alertType: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // === TOKENS ===
  async getTokens(projectId?: number | null): Promise<Token[]> {
    if (projectId) {
      return await db.select().from(tokens).where(eq(tokens.projectId, projectId));
    }
    return await db.select().from(tokens);
  }

  async createToken(name: string, type: string, projectId?: number | null): Promise<Token> {
    // Generate a random token
    const tokenStr = `ag_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
    const [token] = await db.insert(tokens).values({ name, type, token: tokenStr, projectId }).returning();
    return token;
  }

  async getTokenByString(tokenStr: string): Promise<Token | undefined> {
    const [token] = await db.select().from(tokens).where(eq(tokens.token, tokenStr));
    return token;
  }

  async validateToken(tokenStr: string): Promise<boolean> {
    const token = await this.getTokenByString(tokenStr);
    return !!token;
  }

  async revokeToken(id: number): Promise<void> {
    await db.delete(tokens).where(eq(tokens.id, id));
  }

  // === PROJECTS ===
  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async createProject(data: z.infer<typeof insertProjectSchema>): Promise<Project> {
    const slug = data.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    const [project] = await db.insert(projects).values({ ...data, slug }).returning();
    return project;
  }

  async getProjectStatusBySlug(slug: string) {
    const [project] = await db.select().from(projects).where(eq(projects.slug, slug));
    if (!project) return null;

    const resources = await this.getProjectResources(project.id);
    if (!resources) return null;

    const [settings] = await db.select().from(projectAlertSettings).where(eq(projectAlertSettings.projectId, project.id));
    const showWeb = settings?.showWebMonitors ?? true;
    const showServers = settings?.showServers ?? true;
    const showDatabases = settings?.showDatabases ?? true;
    const showClusters = settings?.showClusters ?? true;
    const showDomains = settings?.showDomainMonitors ?? true;
    const domainThreshold = settings?.domainExpiryThreshold ?? 30;

    return {
      project: {
        name: settings?.companyName || project.name,
        description: project.description,
        logoUrl: settings?.logoUrl || null,
        domainExpiryThreshold: domainThreshold,
      },
      servers: showServers ? resources.servers.map(s => ({
        name: s.name || s.hostname,
        status: (s as any).lastSeen && (Date.now() - new Date((s as any).lastSeen).getTime() < 5 * 60 * 1000) ? 'up' : 'down',
        lastSeen: (s as any).lastSeen,
      })) : [],
      databases: showDatabases ? resources.databases.map(d => ({
        name: d.name,
        status: (d as any).lastSeen && (Date.now() - new Date((d as any).lastSeen).getTime() < 5 * 60 * 1000) ? 'up' : 'down',
        lastSeen: (d as any).lastSeen,
      })) : [],
      clusters: showClusters ? resources.clusters.map(c => ({
        name: c.name,
        status: (c as any).lastSeen && (Date.now() - new Date((c as any).lastSeen).getTime() < 5 * 60 * 1000) ? 'up' : 'down',
        lastSeen: (c as any).lastSeen,
      })) : [],
      webMonitors: showWeb ? await Promise.all(resources.webMonitors.map(async w => {
        const lastMetrics = await db.select().from(webMonitorMetrics)
          .where(eq(webMonitorMetrics.monitorId, w.id))
          .orderBy(desc(webMonitorMetrics.createdAt))
          .limit(40);

        return {
          name: w.name,
          url: w.url,
          status: w.lastStatus || 'pending',
          lastCheck: w.lastCheck,
          responseTime: w.metrics?.[0]?.responseTime || null,
          history: lastMetrics.reverse().map(m => ({
            isUp: m.isUp,
            responseTime: m.responseTime,
            createdAt: m.createdAt
          }))
        };
      })) : [],
      domainMonitors: showDomains ? resources.domainMonitors.map(d => ({
        domain: d.domain,
        expiryDate: d.expiryDate,
        status: d.expiryDate && (Math.ceil((new Date(d.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) > domainThreshold) ? 'active' : 'warning',
      })) : [],
    };
  }

  async updateProject(id: number, data: Partial<z.infer<typeof insertProjectSchema>>): Promise<Project> {
    const [project] = await db.update(projects).set(data).where(eq(projects.id, id)).returning();
    return project;
  }

  async deleteProject(id: number): Promise<void> {
    // Set projectId to null for all servers in this project before deleting
    await db.update(servers).set({ projectId: null }).where(eq(servers.projectId, id));
    await db.update(databases).set({ projectId: null }).where(eq(databases.projectId, id));
    await db.update(clusters).set({ projectId: null }).where(eq(clusters.projectId, id));
    await db.delete(projects).where(eq(projects.id, id));
  }

  async getProjectResources(projectId: number) {
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) return null;

    const allServers = await this.getServers();
    const allDbs = await this.getDatabases();
    const allClusters = await this.getClusters();
    const allWeb = await this.getWebMonitors();
    const allDomains = await this.getDomainMonitors();
    const projectTokens = await this.getTokens(projectId);

    return {
      project,
      servers: allServers.filter(s => s.projectId === projectId),
      databases: allDbs.filter(d => d.projectId === projectId),
      clusters: allClusters.filter(c => c.projectId === projectId),
      webMonitors: allWeb.filter(w => w.projectId === projectId),
      domainMonitors: allDomains.filter(d => d.projectId === projectId),
      tokens: projectTokens,
    };
  }

  // === STATS ===
  async getDashboardStats() {
    // In a real app, optimize this with COUNT queries
    const allServers = await this.getServers();
    const allDbs = await this.getDatabases();
    const allClusters = await this.getClusters();

    // Check health based on latest metrics (simplified logic: check if disk usage > 90% in last metric)
    // For now, we'll just count total. Real health checks require complex queries.
    // Let's do a simple heuristic: server "critical" if lastSeen > 10 mins ago OR disk > 90%
    // We need to fetch latest metrics for that.

    // Optimized count queries
    const serverCount = await db.select({ count: sql<number>`count(*)` }).from(servers);
    const dbCount = await db.select({ count: sql<number>`count(*)` }).from(databases);
    const clusterCount = await db.select({ count: sql<number>`count(*)` }).from(clusters);
    const webMonitorCount = await db.select({ count: sql<number>`count(*)` }).from(webMonitors);
    const domainMonitorCount = await db.select({ count: sql<number>`count(*)` }).from(domainMonitors);

    // Mock critical count for now, or fetch simple status
    // To make it real, we'd need to join with metrics.
    return {
      totalServers: Number(serverCount[0].count),
      totalDatabases: Number(dbCount[0].count),
      totalClusters: Number(clusterCount[0].count),
      totalWebMonitors: Number(webMonitorCount[0].count),
      totalDomainMonitors: Number(domainMonitorCount[0].count),
      healthyServers: Number(serverCount[0].count), // Assume healthy for MVP
      criticalServers: 0,
    };
  }

  // === SERVERS ===
  async getServers(): Promise<(Server & { metrics: ServerMetric[], project?: Project })[]> {
    const allServers = await db.select().from(servers).orderBy(desc(servers.lastSeen));

    // Fetch latest metrics and project for each server
    const serversWithExtras = await Promise.all(allServers.map(async (server) => {
      const metrics = await db.select().from(serverMetrics)
        .where(eq(serverMetrics.serverId, server.id))
        .orderBy(desc(serverMetrics.createdAt))
        .limit(1);

      let project;
      if (server.projectId) {
        [project] = await db.select().from(projects).where(eq(projects.id, server.projectId));
      }

      return { ...server, metrics, project };
    }));

    return serversWithExtras;
  }

  async getServer(id: number): Promise<(Server & { metrics: ServerMetric[], project?: Project }) | undefined> {
    const [server] = await db.select().from(servers).where(eq(servers.id, id));
    if (!server) return undefined;

    const metrics = await db.select().from(serverMetrics)
      .where(eq(serverMetrics.serverId, id))
      .orderBy(desc(serverMetrics.createdAt))
      .limit(50); // Last 50 data points

    let project;
    if (server.projectId) {
      [project] = await db.select().from(projects).where(eq(projects.id, server.projectId));
    }

    return { ...server, metrics: metrics.reverse(), project }; // Return chronological
  }

  async upsertServer(data: z.infer<typeof insertServerSchema>): Promise<Server> {
    const updateData: any = { ...data, lastSeen: new Date() };
    // Filter out undefined values to prevent overwriting existing fields (like SSH User/Key) with NULL
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const [server] = await db.insert(servers)
      .values({ ...data, lastSeen: new Date() })
      .onConflictDoUpdate({
        target: servers.hostname,
        set: updateData
      })
      .returning();
    return server;
  }

  async updateServer(id: number, data: Partial<z.infer<typeof insertServerSchema>>): Promise<Server | undefined> {
    const updateData: any = { ...data, lastSeen: new Date() };
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const [updated] = await db.update(servers)
      .set(updateData)
      .where(eq(servers.id, id))
      .returning();
    return updated;
  }

  async deleteServer(id: number): Promise<void> {
    // Delete associated metrics first if not handled by CASCADE
    await db.delete(serverMetrics).where(eq(serverMetrics.serverId, id));
    await db.delete(servers).where(eq(servers.id, id));
  }

  async addServerMetric(data: z.infer<typeof insertServerMetricSchema>): Promise<void> {
    await db.insert(serverMetrics).values(data);
    if (!data.serverId) return;

    await this.checkAndTriggerAlert(data.serverId, 'server', [
      { type: 'cpu', value: data.cpuUsage, operator: '>' },
      { type: 'memory', value: data.memoryUsage, operator: '>' },
      { type: 'storage', value: data.diskUsage, operator: '>' },
    ]);
  }

  async checkAndTriggerAlert(resourceId: number, type: 'server' | 'database' | 'cluster' | 'web' | 'domain', currentMetrics: { type: string, value: number | null | undefined, operator: '>' | '<=' }[]): Promise<void> {
    try {
      const logMsg = `[${new Date().toISOString()}] CHECKING ALERTS for ${type} (ID: ${resourceId}). Metrics: ${JSON.stringify(currentMetrics)}\n`;
      safeLog(logMsg);

      // Get SMTP settings (needed for sending emails)
      const smtpSettings = await this.getSmtpSettings();
      if (!smtpSettings) {
        safeLog(`[${new Date().toISOString()}] NO SMTP SETTINGS FOUND\n`);
        return;
      }

      // Get resource and its project ID
      let resourceName = "";
      let projectId: number | null = null;
      let idFields: any = {};

      if (type === 'server') {
        const s = await this.getServer(resourceId);
        if (!s) return;
        resourceName = s.name || s.hostname;
        projectId = s.projectId;
        idFields.serverId = resourceId;
      } else if (type === 'database') {
        const d = await this.getDatabase(resourceId);
        if (!d) return;
        resourceName = d.name;
        projectId = d.projectId;
        idFields.databaseId = resourceId;
      } else if (type === 'cluster') {
        const c = await this.getCluster(resourceId);
        if (!c) return;
        resourceName = c.name;
        projectId = c.projectId;
        idFields.clusterId = resourceId;
      } else if (type === 'web') {
        const w = await this.getWebMonitor(resourceId);
        if (!w) return;
        resourceName = w.name;
        projectId = w.projectId;
        idFields.webMonitorId = resourceId;
      } else if (type === 'domain') {
        const d = await this.getDomainMonitor(resourceId);
        if (!d) return;
        resourceName = d.domain;
        projectId = d.projectId;
        idFields.domainMonitorId = resourceId;
      }

      // If no project, skip alerts
      if (!projectId) {
        safeLog(`[${new Date().toISOString()}] Resource ${resourceName} has no project, skipping alerts\n`);
        return;
      }

      // Get project-specific alert settings
      const projectAlertConfig = await this.getProjectAlertSettings(projectId);
      if (!projectAlertConfig) {
        safeLog(`[${new Date().toISOString()}] No alert settings for project ${projectId}\n`);
        return;
      }

      safeLog(`[${new Date().toISOString()}] Project alert settings found. Recipients: ${JSON.stringify(projectAlertConfig.alertRecipients)}\n`);

      const thresholds = {
        cpu: projectAlertConfig.cpuThreshold,
        memory: projectAlertConfig.memoryThreshold,
        storage: projectAlertConfig.storageThreshold,
        db_storage: projectAlertConfig.dbStorageThreshold,
        db_connections: projectAlertConfig.dbConnectionThreshold,
        cluster_cpu: projectAlertConfig.clusterCpuThreshold,
        cluster_memory: projectAlertConfig.clusterMemoryThreshold,
        web_status: 1, // 1 means UP, so if current is 0 it's breached (if <)
        web_response: projectAlertConfig.webResponseThreshold,
        web_ssl: projectAlertConfig.webSslExpiryThreshold,
        domain_expiry: projectAlertConfig.domainExpiryThreshold,
      };

      for (const m of currentMetrics) {
        const threshold = (thresholds as any)[m.type];
        // If threshold is null, the alert type is disabled for this project
        if (m.value === null || m.value === undefined || threshold === null || threshold === undefined) continue;

        const isBreached = m.operator === '>' ? m.value > threshold : m.value <= threshold;

        if (isBreached) {
          safeLog(`[${new Date().toISOString()}] BREACH DETECTED for ${resourceName} ${m.type}. Value: ${m.value}, Threshold: ${threshold}\n`);
          // Check if alert was already sent recently (within 1 hour)
          const [lastAlert] = await db.select().from(alerts)
            .where(sql`${alerts.type} = ${m.type} AND ${alerts.sentAt} > NOW() - INTERVAL '1 hour' AND (
              (${alerts.serverId} IS NOT NULL AND ${alerts.serverId} = ${idFields.serverId || 0}) OR
              (${alerts.databaseId} IS NOT NULL AND ${alerts.databaseId} = ${idFields.databaseId || 0}) OR
              (${alerts.clusterId} IS NOT NULL AND ${alerts.clusterId} = ${idFields.clusterId || 0}) OR
              (${alerts.webMonitorId} IS NOT NULL AND ${alerts.webMonitorId} = ${idFields.webMonitorId || 0}) OR
              (${alerts.domainMonitorId} IS NOT NULL AND ${alerts.domainMonitorId} = ${idFields.domainMonitorId || 0})
            )`)
            .limit(1);

          if (!lastAlert) {
            console.log(`[ALERTS] Triggering alert for ${resourceName}: ${m.type} value ${m.value} (threshold ${threshold})`);
            await this.createAlert({
              ...idFields,
              type: m.type,
              value: m.value,
              threshold: threshold,
            });

            // Send to project-specific recipients
            const recipients = projectAlertConfig.alertRecipients && projectAlertConfig.alertRecipients.length > 0
              ? projectAlertConfig.alertRecipients
              : [smtpSettings.fromEmail];

            // Use project-specific branding
            const branding = {
              companyName: projectAlertConfig.companyName,
              logoUrl: projectAlertConfig.logoUrl,
            };

            // Use project-specific SMTP if available, else fallback to global
            const emailSettings = {
              host: projectAlertConfig.smtpHost || smtpSettings.host,
              port: projectAlertConfig.smtpPort || smtpSettings.port,
              user: projectAlertConfig.smtpUser || smtpSettings.user,
              pass: projectAlertConfig.smtpPass || smtpSettings.pass,
              fromEmail: projectAlertConfig.smtpSenderEmail || smtpSettings.fromEmail,
              senderName: projectAlertConfig.smtpSenderName || projectAlertConfig.companyName || (smtpSettings as any).senderName || "InfraWatch Alert",
            };

            // Define alert categories
            const typeToCategory: Record<string, string> = {
              'cpu': 'Server',
              'memory': 'Server',
              'storage': 'Server',
              'db_storage': 'Database',
              'db_connections': 'Database',
              'web_status': 'Web',
              'web_response': 'Web',
              'web_ssl': 'Web',
              'cluster_cpu': 'Cluster',
              'cluster_memory': 'Cluster',
              'domain_expiry': 'Domain'
            };

            const category = typeToCategory[m.type];

            // Use project-specific template if available
            // Check for specific alert type first, then for category fallback
            let [customTemplate] = await db.select().from(projectEmailTemplates)
              .where(sql`${projectEmailTemplates.projectId} = ${projectId} AND ${projectEmailTemplates.alertType} = ${m.type}`)
              .limit(1);

            if (!customTemplate && category) {
              [customTemplate] = await db.select().from(projectEmailTemplates)
                .where(sql`${projectEmailTemplates.projectId} = ${projectId} AND ${projectEmailTemplates.alertType} = ${category}`)
                .limit(1);
            }

            // Fetch project name
            const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
            const projectName = project?.name || "Unknown Project";

            for (const recipient of recipients) {
              await EmailService.sendAlertEmail(
                recipient,
                resourceName,
                projectName,
                m.type,
                m.value,
                threshold,
                emailSettings as any,
                branding,
                customTemplate
              );
            }
            safeLog(`[${new Date().toISOString()}] Alert emails SENT to ${recipients.join(', ')}\n`);
            console.log(`[ALERTS] Alert emails sent to ${recipients.join(', ')}`);
          } else {
            safeLog(`[${new Date().toISOString()}] Alert SKIPPED (spam protection) for ${resourceName} ${m.type}\n`);
            console.log(`[ALERTS] Alert for ${resourceName} ${m.type} already sent within the last hour. Skipping.`);
          }
        }
      }
    } catch (err) {
      console.error("Alert check error:", err);
    }
  }

  // === SETTINGS ===
  async getSmtpSettings(): Promise<SmtpSettings | undefined> {
    const [settings] = await db.select().from(smtpSettings).limit(1);
    return settings;
  }

  async upsertSmtpSettings(data: any): Promise<SmtpSettings> {
    try {
      safeLog(`[${new Date().toISOString()}] UPSERTIING SMTP SETTINGS.\n`);
      const existing = await this.getSmtpSettings();
      if (existing) {
        safeLog(`[${new Date().toISOString()}] Updating existing settings ID: ${existing.id}\n`);
        const [updated] = await db.update(smtpSettings)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(smtpSettings.id, existing.id))
          .returning();
        EmailService.clearTransporter();
        return updated as SmtpSettings;
      }
      safeLog(`[${new Date().toISOString()}] Inserting new settings\n`);
      const [newSettings] = await db.insert(smtpSettings)
        .values(data)
        .returning();
      return newSettings as SmtpSettings;
    } catch (err) {
      safeLog(`[${new Date().toISOString()}] Error in upsertSmtpSettings: ${err}\n`);
      throw err;
    }
  }

  // === PROJECT ALERT SETTINGS ===
  async getProjectAlertSettings(projectId: number): Promise<ProjectAlertSettings | undefined> {
    const [settings] = await db.select().from(projectAlertSettings)
      .where(eq(projectAlertSettings.projectId, projectId))
      .limit(1);
    return settings;
  }

  async upsertProjectAlertSettings(projectId: number, data: Partial<z.infer<typeof insertProjectAlertSettingsSchema>>): Promise<ProjectAlertSettings> {
    const existing = await this.getProjectAlertSettings(projectId);
    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    if (existing) {
      const [updated] = await db.update(projectAlertSettings)
        .set(updateData)
        .where(eq(projectAlertSettings.id, existing.id))
        .returning();
      return updated as ProjectAlertSettings;
    }
    const [newSettings] = await db.insert(projectAlertSettings)
      .values({ projectId, ...data } as any)
      .returning();
    return newSettings as ProjectAlertSettings;
  }

  // === ALERTS ===
  async getRecentAlerts(serverId: number): Promise<Alert[]> {
    return await db.select().from(alerts)
      .where(eq(alerts.serverId, serverId))
      .orderBy(desc(alerts.sentAt))
      .limit(10);
  }

  async getAlertHistory(): Promise<(Alert & { serverName: string })[]> {
    const results = await db.select({
      alert: alerts,
      serverName: servers.name,
      hostname: servers.hostname,
      dbName: databases.name,
      clusterName: clusters.name,
      webName: webMonitors.name
    })
      .from(alerts)
      .leftJoin(servers, eq(alerts.serverId, servers.id))
      .leftJoin(databases, eq(alerts.databaseId, databases.id))
      .leftJoin(clusters, eq(alerts.clusterId, clusters.id))
      .leftJoin(webMonitors, eq(alerts.webMonitorId, webMonitors.id))
      .orderBy(desc(alerts.sentAt))
      .limit(50);

    return results.map(r => ({
      ...r.alert,
      serverName: r.serverName || r.hostname || r.dbName || r.clusterName || r.webName || "Unknown Resource"
    }));
  }

  async createAlert(data: { serverId?: number, databaseId?: number, clusterId?: number, webMonitorId?: number, type: string, value: number, threshold: number }): Promise<void> {
    await db.insert(alerts).values(data);
  }

  // === PROJECT EMAIL TEMPLATES ===
  async getProjectEmailTemplates(projectId: number): Promise<ProjectEmailTemplate[]> {
    return await db.select().from(projectEmailTemplates).where(eq(projectEmailTemplates.projectId, projectId));
  }

  async upsertProjectEmailTemplate(projectId: number, alertType: string, data: { subject: string, body: string }): Promise<ProjectEmailTemplate> {
    const [existing] = await db.select().from(projectEmailTemplates)
      .where(sql`${projectEmailTemplates.projectId} = ${projectId} AND ${projectEmailTemplates.alertType} = ${alertType}`)
      .limit(1);

    if (existing) {
      const [updated] = await db.update(projectEmailTemplates)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(projectEmailTemplates.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db.insert(projectEmailTemplates)
      .values({ projectId, alertType, ...data })
      .returning();
    return created;
  }

  async deleteProjectEmailTemplate(projectId: number, alertType: string): Promise<void> {
    await db.delete(projectEmailTemplates)
      .where(sql`${projectEmailTemplates.projectId} = ${projectId} AND ${projectEmailTemplates.alertType} = ${alertType}`);
  }

  // === DATABASES ===
  async getDatabases(): Promise<(Database & { metrics: DatabaseMetric[], project?: Project })[]> {
    const allDbs = await db.select().from(databases).orderBy(desc(databases.lastSeen));
    return await Promise.all(allDbs.map(async (dbItem) => {
      const metrics = await db.select().from(databaseMetrics)
        .where(eq(databaseMetrics.databaseId, dbItem.id))
        .orderBy(desc(databaseMetrics.createdAt))
        .limit(1);

      let project;
      if (dbItem.projectId) {
        [project] = await db.select().from(projects).where(eq(projects.id, dbItem.projectId));
      }
      return { ...dbItem, metrics, project };
    }));
  }

  async getDatabase(id: number): Promise<(Database & { metrics: DatabaseMetric[], project?: Project }) | undefined> {
    const [database] = await db.select().from(databases).where(eq(databases.id, id));
    if (!database) return undefined;

    const metrics = await db.select().from(databaseMetrics)
      .where(eq(databaseMetrics.databaseId, id))
      .orderBy(desc(databaseMetrics.createdAt))
      .limit(50);

    let project;
    if (database.projectId) {
      [project] = await db.select().from(projects).where(eq(projects.id, database.projectId));
    }

    return { ...database, metrics: metrics.reverse(), project };
  }

  async upsertDatabase(data: z.infer<typeof insertDatabaseSchema>): Promise<Database> {
    // We don't have a unique constraint on 'name' alone in the table definition I wrote earlier?
    // Wait, earlier I didn't make 'name' unique in schema.ts for databases.
    // Let's assume name is unique for the project scope, or we rely on the agent sending ID.
    // Actually, agents send metadata. Let's look up by name.

    // Fix: We need to handle lookup manually if no unique constraint, or trust the agent provides consistent name.
    // Best effort: Try to find by name, update if exists, else insert.
    const [existing] = await db.select().from(databases).where(eq(databases.name, data.name));

    if (existing) {
      const [updated] = await db.update(databases)
        .set({ ...data, lastSeen: new Date() })
        .where(eq(databases.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(databases)
        .values({ ...data, lastSeen: new Date() })
        .returning();
      return created;
    }
  }

  async updateDatabase(id: number, data: Partial<z.infer<typeof insertDatabaseSchema>>): Promise<Database | undefined> {
    const [updated] = await db.update(databases)
      .set({ ...data, lastSeen: new Date() })
      .where(eq(databases.id, id))
      .returning();
    return updated;
  }

  async deleteDatabase(id: number): Promise<void> {
    await db.delete(databaseMetrics).where(eq(databaseMetrics.databaseId, id));
    await db.delete(databases).where(eq(databases.id, id));
  }

  async addDatabaseMetric(data: z.infer<typeof insertDatabaseMetricSchema>): Promise<void> {
    await db.insert(databaseMetrics).values(data);
    if (!data.databaseId) return;

    await this.checkAndTriggerAlert(data.databaseId, 'database', [
      { type: 'db_storage', value: data.storageUsed, operator: '>' },
    ]);
  }

  // === CLUSTERS ===
  async getClusters(): Promise<(Cluster & { project?: Project })[]> {
    const allClusters = await db.select().from(clusters).orderBy(desc(clusters.lastSeen));
    return await Promise.all(allClusters.map(async (cluster) => {
      let project;
      if (cluster.projectId) {
        [project] = await db.select().from(projects).where(eq(projects.id, cluster.projectId));
      }
      return { ...cluster, project };
    }));
  }

  async getCluster(id: number): Promise<(Cluster & { metrics: ClusterMetric[], project?: Project }) | undefined> {
    const [cluster] = await db.select().from(clusters).where(eq(clusters.id, id));
    if (!cluster) return undefined;

    const metrics = await db.select().from(clusterMetrics)
      .where(eq(clusterMetrics.clusterId, id))
      .orderBy(desc(clusterMetrics.createdAt))
      .limit(50);

    let project;
    if (cluster.projectId) {
      [project] = await db.select().from(projects).where(eq(projects.id, cluster.projectId));
    }

    return { ...cluster, metrics: metrics.reverse(), project };
  }

  async upsertCluster(data: z.infer<typeof insertClusterSchema>): Promise<Cluster> {
    const [cluster] = await db.insert(clusters)
      .values({ ...data, lastSeen: new Date() })
      .onConflictDoUpdate({
        target: clusters.name,
        set: { ...data, lastSeen: new Date() }
      })
      .returning();
    return cluster;
  }

  async addClusterMetric(data: z.infer<typeof insertClusterMetricSchema>): Promise<void> {
    await db.insert(clusterMetrics).values(data);
    if (!data.clusterId) return;

    await this.checkAndTriggerAlert(data.clusterId, 'cluster', [
      { type: 'cluster_cpu', value: data.cpuUsage, operator: '>' },
      { type: 'cluster_memory', value: data.memoryUsage, operator: '>' },
    ]);
  }

  // === USERS ===
  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(data: z.infer<typeof insertUserSchema>): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // === WEB MONITORS ===
  async getWebMonitors(): Promise<(WebMonitor & { metrics: WebMonitorMetric[], project?: Project })[]> {
    const allWebMonitors = await db.select().from(webMonitors).orderBy(desc(webMonitors.createdAt));
    return await Promise.all(allWebMonitors.map(async (monitor) => {
      const metrics = await db.select().from(webMonitorMetrics)
        .where(eq(webMonitorMetrics.monitorId, monitor.id))
        .orderBy(desc(webMonitorMetrics.createdAt))
        .limit(1);

      let project;
      if (monitor.projectId) {
        [project] = await db.select().from(projects).where(eq(projects.id, monitor.projectId));
      }

      return { ...monitor, metrics, project };
    }));
  }

  async getWebMonitor(id: number): Promise<(WebMonitor & { metrics: WebMonitorMetric[], project?: Project }) | undefined> {
    const [monitor] = await db.select().from(webMonitors).where(eq(webMonitors.id, id));
    if (!monitor) return undefined;

    const metrics = await db.select().from(webMonitorMetrics)
      .where(eq(webMonitorMetrics.monitorId, id))
      .orderBy(desc(webMonitorMetrics.createdAt))
      .limit(50);

    let project;
    if (monitor.projectId) {
      [project] = await db.select().from(projects).where(eq(projects.id, monitor.projectId));
    }

    return { ...monitor, metrics: metrics.reverse(), project };
  }

  async createWebMonitor(data: z.infer<typeof insertWebMonitorSchema>): Promise<WebMonitor> {
    const [monitor] = await db.insert(webMonitors).values(data).returning();
    return monitor;
  }

  async updateWebMonitor(id: number, data: Partial<WebMonitor>): Promise<WebMonitor | undefined> {
    const [updated] = await db.update(webMonitors)
      .set(data)
      .where(eq(webMonitors.id, id))
      .returning();
    return updated;
  }

  async deleteWebMonitor(id: number): Promise<void> {
    await db.delete(webMonitorMetrics).where(eq(webMonitorMetrics.monitorId, id));
    await db.delete(webMonitors).where(eq(webMonitors.id, id));
  }

  async addWebMonitorMetric(data: z.infer<typeof insertWebMonitorMetricSchema>): Promise<void> {
    await db.insert(webMonitorMetrics).values(data);
    if (!data.monitorId) return;

    // Trigger alerts if DOWN
    if (!data.isUp) {
      await this.checkAndTriggerAlert(data.monitorId, 'web', [
        { type: 'web_status', value: 0, operator: '<=' }, // 0 means down, threshold is 1 (UP)
      ]);
    }

    // Trigger response time alerts
    if (data.responseTime) {
      await this.checkAndTriggerAlert(data.monitorId, 'web', [
        { type: 'web_response', value: data.responseTime, operator: '>' },
      ]);
    }
  }

  // === DOMAIN MONITORS ===
  async getDomainMonitors(): Promise<(DomainMonitor & { project?: Project })[]> {
    const allDomains = await db.select().from(domainMonitors).orderBy(desc(domainMonitors.createdAt));
    return await Promise.all(allDomains.map(async (domain) => {
      let project;
      if (domain.projectId) {
        [project] = await db.select().from(projects).where(eq(projects.id, domain.projectId));
      }
      return { ...domain, project };
    }));
  }

  async getDomainMonitor(id: number): Promise<(DomainMonitor & { project?: Project }) | undefined> {
    const [domain] = await db.select().from(domainMonitors).where(eq(domainMonitors.id, id));
    if (!domain) return undefined;

    let project;
    if (domain.projectId) {
      [project] = await db.select().from(projects).where(eq(projects.id, domain.projectId));
    }

    return { ...domain, project };
  }

  async createDomainMonitor(data: z.infer<typeof insertDomainMonitorSchema>): Promise<DomainMonitor> {
    const [monitor] = await db.insert(domainMonitors).values(data).returning();
    return monitor;
  }

  async updateDomainMonitor(id: number, data: DomainMonitorUpdate): Promise<DomainMonitor | undefined> {
    const [updated] = await db.update(domainMonitors)
      .set(data)
      .where(eq(domainMonitors.id, id))
      .returning();
    return updated;
  }

  async deleteDomainMonitor(id: number): Promise<void> {
    await db.delete(domainMonitors).where(eq(domainMonitors.id, id));
  }
}

export const storage = new DatabaseStorage();
