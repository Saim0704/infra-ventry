import { sql } from "drizzle-orm";
import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real, index, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === SESSIONS (Replit Auth) ===
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// === USERS ===
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").default("read").notNull(), // 'admin' or 'read'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === AGENT TOKENS ===
export const tokens = pgTable("tokens", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // e.g., "Production VM Agent"
  token: text("token").notNull().unique(),
  type: text("type").notNull(), // "vm", "database", "kubernetes"
  projectId: integer("project_id").references(() => projects.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
});

// === VM AGENT ===
export const servers = pgTable("servers", {
  id: serial("id").primaryKey(),
  hostname: text("hostname").notNull().unique(),
  name: text("name"),
  os: text("os"),
  cpuCores: integer("cpu_cores"),
  totalRam: real("total_ram"), // in GB
  totalDisk: real("total_disk"), // in GB
  ipAddress: text("ip_address"),
  osVersion: text("os_version"),
  sshUser: text("ssh_user"),
  sshKey: text("ssh_key"),
  projectId: integer("project_id").references(() => projects.id, { onDelete: 'cascade' }),
  serviceVersions: jsonb("service_versions"),
  checkInterval: integer("check_interval").default(5).notNull(), // Interval in minutes
  lastAuditAt: timestamp("last_audit_at"),
  lastSeen: timestamp("last_seen").defaultNow(),
  sortOrder: integer("sort_order").default(0).notNull(),
  agentVersion: text("agent_version").default("v1"),
  pendingUpdate: boolean("pending_update").default(false),
});

// === PROJECTS ===
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

// === PROJECT ALERT SETTINGS ===
export const projectAlertSettings = pgTable("project_alert_settings", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: 'cascade' }).notNull().unique(),

  // Alert Recipients
  alertRecipients: jsonb("alert_recipients").$type<string[]>().notNull().default([]),

  // Branding
  companyName: text("company_name"),
  logoUrl: text("logo_url"),

  // Server Thresholds
  cpuThreshold: real("cpu_threshold").default(80),
  memoryThreshold: real("memory_threshold").default(80),
  storageThreshold: real("storage_threshold").default(80),

  // Database Thresholds
  dbStorageThreshold: real("db_storage_threshold").default(80),
  dbConnectionThreshold: real("db_connection_threshold").default(100),

  // Cluster Thresholds
  clusterCpuThreshold: real("cluster_cpu_threshold").default(80),
  clusterMemoryThreshold: real("cluster_memory_threshold").default(80),

  // Web Monitor Thresholds
  webResponseThreshold: integer("web_response_threshold").default(3000),
  webSslExpiryThreshold: integer("web_ssl_expiry_threshold").default(14),

  // Status Page Visibility Toggles
  showWebMonitors: boolean("show_web_monitors").default(true).notNull(),
  showServers: boolean("show_servers").default(true).notNull(),
  showDatabases: boolean("show_databases").default(true).notNull(),
  showClusters: boolean("show_clusters").default(true).notNull(),
  showDomainMonitors: boolean("show_domain_monitors").default(true).notNull(),
  domainExpiryThreshold: integer("domain_expiry_threshold").default(30).notNull(),

  // Project Specific SMTP
  smtpHost: text("smtp_host"),
  smtpPort: integer("smtp_port"),
  smtpUser: text("smtp_user"),
  smtpPass: text("smtp_pass"),
  smtpSenderName: text("smtp_sender_name"),
  smtpSenderEmail: text("smtp_sender_email"),

  // Per-resource alert muting: { servers: [id,...], databases: [id,...], clusters: [id,...], webMonitors: [id,...], domainMonitors: [id,...] }
  alertMutedResources: jsonb("alert_muted_resources").$type<{
    servers?: number[];
    databases?: number[];
    clusters?: number[];
    webMonitors?: number[];
    domainMonitors?: number[];
  }>().default({}),

  // Individual Alert Toggles
  cpuAlertEnabled: boolean("cpu_alert_enabled").default(true).notNull(),
  memoryAlertEnabled: boolean("memory_alert_enabled").default(true).notNull(),
  storageAlertEnabled: boolean("storage_alert_enabled").default(true).notNull(),
  dbStorageAlertEnabled: boolean("db_storage_alert_enabled").default(true).notNull(),
  dbConnectionAlertEnabled: boolean("db_connection_alert_enabled").default(true).notNull(),
  clusterCpuAlertEnabled: boolean("cluster_cpu_alert_enabled").default(true).notNull(),
  clusterMemoryAlertEnabled: boolean("cluster_memory_alert_enabled").default(true).notNull(),
  webResponseAlertEnabled: boolean("web_response_alert_enabled").default(true).notNull(),
  webStatusAlertEnabled: boolean("web_status_alert_enabled").default(true).notNull(),
  webSslAlertEnabled: boolean("web_ssl_alert_enabled").default(true).notNull(),
  domainExpiryAlertEnabled: boolean("domain_expiry_alert_enabled").default(true).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === EMAIL TEMPLATES ===
export const projectEmailTemplates = pgTable("project_email_templates", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  alertType: text("alert_type").notNull(), // 'server_down', 'cpu_high', 'memory_high', 'storage_high', 'db_storage_high', 'db_conn_high', 'web_down', 'web_ssl_expiring', 'domain_expiring'
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("project_alert_type_idx").on(table.projectId, table.alertType)
]);


export const serverMetrics = pgTable("server_metrics", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").references(() => servers.id, { onDelete: 'cascade' }),
  cpuUsage: real("cpu_usage"), // %
  memoryUsage: real("memory_usage"), // %
  diskUsage: real("disk_usage"), // %
  topProcesses: jsonb("top_processes"), // Array of { pid, name, cpu, memory }
  createdAt: timestamp("created_at").defaultNow(),
});

// === SETTINGS & ALERTS ===
export const smtpSettings = pgTable("smtp_settings", {
  id: serial("id").primaryKey(),
  host: text("host").notNull(),
  port: integer("port").notNull(),
  user: text("user").notNull(),
  pass: text("pass").notNull(),
  fromEmail: text("from_email").notNull(),
  senderName: text("sender_name").default("Infrastructure Monitor"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").references(() => servers.id, { onDelete: 'cascade' }),
  databaseId: integer("database_id").references(() => databases.id, { onDelete: 'cascade' }),
  clusterId: integer("cluster_id").references(() => clusters.id, { onDelete: 'cascade' }),
  webMonitorId: integer("web_monitor_id").references(() => webMonitors.id, { onDelete: 'cascade' }),
  domainMonitorId: integer("domain_monitor_id").references(() => domainMonitors.id, { onDelete: 'cascade' }),
  type: text("type").notNull(),
  value: real("value").notNull(),
  threshold: real("threshold").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// === DATABASE AGENT ===
export const databases = pgTable("databases", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // Identifier
  engine: text("engine"), // Postgres, MySQL, etc.
  version: text("version"),
  host: text("host"),
  port: integer("port"),
  projectId: integer("project_id").references(() => projects.id, { onDelete: 'cascade' }),
  lastSeen: timestamp("last_seen").defaultNow(),
});

export const databaseMetrics = pgTable("database_metrics", {
  id: serial("id").primaryKey(),
  databaseId: integer("database_id").references(() => databases.id, { onDelete: 'cascade' }),
  storageUsed: real("storage_used"), // GB
  activeConnections: integer("active_connections"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === KUBERNETES AGENT ===
export const clusters = pgTable("clusters", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  version: text("version"),
  nodeCount: integer("node_count"),
  totalCpu: real("total_cpu"),
  totalMemory: real("total_memory"),
  projectId: integer("project_id").references(() => projects.id, { onDelete: 'cascade' }),
  lastSeen: timestamp("last_seen").defaultNow(),
});

export const clusterMetrics = pgTable("cluster_metrics", {
  id: serial("id").primaryKey(),
  clusterId: integer("cluster_id").references(() => clusters.id, { onDelete: 'cascade' }),
  cpuUsage: real("cpu_usage"),
  memoryUsage: real("memory_usage"),
  podCount: integer("pod_count"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === WEB MONITOR ===
export const webMonitors = pgTable("web_monitors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  method: text("method").default("GET").notNull(),
  expectedStatus: integer("expected_status").default(200).notNull(),
  healthCheckString: text("health_check_string"),
  followRedirects: boolean("follow_redirects").default(true).notNull(),
  timeout: integer("timeout").default(10000).notNull(), // in ms
  sslExpiryThreshold: integer("ssl_expiry_threshold").default(7).notNull(), // in days
  projectId: integer("project_id").references(() => projects.id, { onDelete: 'cascade' }),
  lastStatus: text("last_status"), // 'up', 'down', 'unknown'
  sslStatus: text("ssl_status"), // 'valid', 'expiring', 'expired', 'invalid'
  sslExpiryDate: timestamp("ssl_expiry_date"),
  lastCheck: timestamp("last_check"),
  nextCheck: timestamp("next_check"),
  serverName: text("server_name"),
  tlsVersion: text("tls_version"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const webMonitorMetrics = pgTable("web_monitor_metrics", {
  id: serial("id").primaryKey(),
  monitorId: integer("monitor_id").references(() => webMonitors.id, { onDelete: 'cascade' }),
  responseTime: integer("response_time"), // in ms
  status: integer("status"), // HTTP status code
  isUp: boolean("is_up").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// === DOMAIN MONITOR ===
export const domainMonitors = pgTable("domain_monitors", {
  id: serial("id").primaryKey(),
  domain: text("domain").notNull(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: 'cascade' }),
  expiryDate: timestamp("expiry_date"),
  lastCheck: timestamp("last_check"),
  nextCheck: timestamp("next_check"),
  lastAlertSentAt: timestamp("last_alert_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===
export const projectsRelations = relations(projects, ({ many, one }) => ({
  servers: many(servers),
  databases: many(databases),
  clusters: many(clusters),
  webMonitors: many(webMonitors),
  domainMonitors: many(domainMonitors),
  tokens: many(tokens),
  alertSettings: one(projectAlertSettings, {
    fields: [projects.id],
    references: [projectAlertSettings.projectId],
  }),
  emailTemplates: many(projectEmailTemplates),
}));

export const serversRelations = relations(servers, ({ one, many }) => ({
  metrics: many(serverMetrics),
  alerts: many(alerts),
  project: one(projects, {
    fields: [servers.projectId],
    references: [projects.id],
  }),
}));

export const serverMetricsRelations = relations(serverMetrics, ({ one }) => ({
  server: one(servers, {
    fields: [serverMetrics.serverId],
    references: [servers.id],
  }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  server: one(servers, {
    fields: [alerts.serverId],
    references: [servers.id],
  }),
  database: one(databases, {
    fields: [alerts.databaseId],
    references: [databases.id],
  }),
  cluster: one(clusters, {
    fields: [alerts.clusterId],
    references: [clusters.id],
  }),
  webMonitor: one(webMonitors, {
    fields: [alerts.webMonitorId],
    references: [webMonitors.id],
  }),
  domainMonitor: one(domainMonitors, {
    fields: [alerts.domainMonitorId],
    references: [domainMonitors.id],
  }),
}));

export const databasesRelations = relations(databases, ({ one, many }) => ({
  metrics: many(databaseMetrics),
  project: one(projects, {
    fields: [databases.projectId],
    references: [projects.id],
  }),
}));

export const databaseMetricsRelations = relations(databaseMetrics, ({ one }) => ({
  database: one(databases, {
    fields: [databaseMetrics.databaseId],
    references: [databases.id],
  }),
}));

export const clustersRelations = relations(clusters, ({ one, many }) => ({
  metrics: many(clusterMetrics),
  project: one(projects, {
    fields: [clusters.projectId],
    references: [projects.id],
  }),
}));

export const clusterMetricsRelations = relations(clusterMetrics, ({ one }) => ({
  cluster: one(clusters, {
    fields: [clusterMetrics.clusterId],
    references: [clusters.id],
  }),
}));

export const tokensRelations = relations(tokens, ({ one }) => ({
  project: one(projects, {
    fields: [tokens.projectId],
    references: [projects.id],
  }),
}));

export const projectAlertSettingsRelations = relations(projectAlertSettings, ({ one }) => ({
  project: one(projects, {
    fields: [projectAlertSettings.projectId],
    references: [projects.id],
  }),
}));

export const projectEmailTemplatesRelations = relations(projectEmailTemplates, ({ one }) => ({
  project: one(projects, {
    fields: [projectEmailTemplates.projectId],
    references: [projects.id],
  }),
}));

export const webMonitorsRelations = relations(webMonitors, ({ one, many }) => ({
  metrics: many(webMonitorMetrics),
  project: one(projects, {
    fields: [webMonitors.projectId],
    references: [projects.id],
  }),
}));

export const webMonitorMetricsRelations = relations(webMonitorMetrics, ({ one }) => ({
  monitor: one(webMonitors, {
    fields: [webMonitorMetrics.monitorId],
    references: [webMonitors.id],
  }),
}));

export const domainMonitorsRelations = relations(domainMonitors, ({ one }) => ({
  project: one(projects, {
    fields: [domainMonitors.projectId],
    references: [projects.id],
  }),
}));


// === ZOD SCHEMAS ===
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
}).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTokenSchema = createInsertSchema(tokens).omit({ id: true, createdAt: true });

export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, slug: true, createdAt: true });
export const insertServerSchema = createInsertSchema(servers).omit({ id: true, lastSeen: true });
export const insertServerMetricSchema = createInsertSchema(serverMetrics).omit({ id: true, createdAt: true });

export const insertSmtpSettingsSchema = createInsertSchema(smtpSettings).omit({ id: true, updatedAt: true });
export const insertProjectAlertSettingsSchema = createInsertSchema(projectAlertSettings).omit({ id: true, updatedAt: true });
export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true, sentAt: true, resolvedAt: true });

export const insertDatabaseSchema = createInsertSchema(databases).omit({ id: true, lastSeen: true });
export const insertDatabaseMetricSchema = createInsertSchema(databaseMetrics).omit({ id: true, createdAt: true });

export const insertClusterSchema = createInsertSchema(clusters).omit({ id: true, lastSeen: true });
export const insertClusterMetricSchema = createInsertSchema(clusterMetrics).omit({ id: true, createdAt: true });

export const insertWebMonitorSchema = createInsertSchema(webMonitors).omit({ id: true, createdAt: true, lastCheck: true, nextCheck: true, lastStatus: true, sslStatus: true, sslExpiryDate: true, serverName: true, tlsVersion: true });
export const insertWebMonitorMetricSchema = createInsertSchema(webMonitorMetrics).omit({ id: true, createdAt: true });

export const insertProjectEmailTemplateSchema = createInsertSchema(projectEmailTemplates).omit({ id: true, updatedAt: true });

export const insertDomainMonitorSchema = createInsertSchema(domainMonitors).omit({ id: true, createdAt: true, lastCheck: true, nextCheck: true, expiryDate: true, lastAlertSentAt: true });

// Form Schema for Manual Server Entry
export const serverWithMetricsSchema = z.object({
  hostname: z.string().min(1, "Hostname is required"),
  name: z.string().optional(),
  ipAddress: z.string().optional(),
  os: z.string().optional(),
  osVersion: z.string().optional(),
  cpuCores: z.number().int().min(1, "CPU Cores must be at least 1"),
  totalRam: z.number().min(0, "Total RAM must be positive"),
  totalDisk: z.number().min(0, "Total Disk must be positive"),
  sshUser: z.string().optional(),
  sshKey: z.string().optional(),
  projectId: z.number().nullable().optional(),
  cpuUsage: z.number().min(0).max(100, "CPU Usage must be between 0 and 100").optional(),
  ramUsed: z.number().min(0, "RAM Used must be positive").optional(),
  storageUsed: z.number().min(0, "Storage Used must be positive").optional(),
  memoryUsage: z.number().min(0).max(100).optional(),
  diskUsage: z.number().min(0).max(100).optional(),
  checkInterval: z.number().int().min(1).default(5).optional(),
  sortOrder: z.number().int().optional(),
});

// === TYPES ===
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Token = typeof tokens.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Server = typeof servers.$inferSelect;
export type ServerMetric = typeof serverMetrics.$inferSelect;
export type SmtpSettings = typeof smtpSettings.$inferSelect;
export type InsertSmtpSettings = z.infer<typeof insertSmtpSettingsSchema>;
export type Alert = typeof alerts.$inferSelect;
export type Database = typeof databases.$inferSelect;
export type DatabaseMetric = typeof databaseMetrics.$inferSelect;
export type Cluster = typeof clusters.$inferSelect;
export type ClusterMetric = typeof clusterMetrics.$inferSelect;
export type ProjectAlertSettings = typeof projectAlertSettings.$inferSelect;
export type InsertProjectAlertSettings = z.infer<typeof insertProjectAlertSettingsSchema>;
export type WebMonitor = typeof webMonitors.$inferSelect;
export type WebMonitorMetric = typeof webMonitorMetrics.$inferSelect;
export type InsertWebMonitor = z.infer<typeof insertWebMonitorSchema>;
export type InsertWebMonitorMetric = z.infer<typeof insertWebMonitorMetricSchema>;
export type DomainMonitor = typeof domainMonitors.$inferSelect;
export type InsertDomainMonitor = z.infer<typeof insertDomainMonitorSchema>;
export type ProjectEmailTemplate = typeof projectEmailTemplates.$inferSelect;
export type InsertProjectEmailTemplate = z.infer<typeof insertProjectEmailTemplateSchema>;

// For internal service updates (full object but optional fields)
export type WebMonitorUpdate = Partial<WebMonitor>;
export type DomainMonitorUpdate = Partial<DomainMonitor>;
