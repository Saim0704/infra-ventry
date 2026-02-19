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
  projectId: integer("project_id").references(() => projects.id),
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
  projectId: integer("project_id").references(() => projects.id),
  lastSeen: timestamp("last_seen").defaultNow(),
});

// === PROJECTS ===
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

// === PROJECT ALERT SETTINGS ===
export const projectAlertSettings = pgTable("project_alert_settings", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull().unique(),

  // Alert Recipients
  alertRecipients: jsonb("alert_recipients").$type<string[]>().notNull().default([]),

  // Branding
  companyName: text("company_name"),
  logoUrl: text("logo_url"),

  // Thresholds (null means alert is disabled for this project)
  cpuThreshold: real("cpu_threshold").default(80),
  memoryThreshold: real("memory_threshold").default(80),
  storageThreshold: real("storage_threshold").default(80),

  updatedAt: timestamp("updated_at").defaultNow(),
});


export const serverMetrics = pgTable("server_metrics", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").references(() => servers.id),
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
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").references(() => servers.id),
  databaseId: integer("database_id").references(() => databases.id),
  clusterId: integer("cluster_id").references(() => clusters.id),
  webMonitorId: integer("web_monitor_id").references(() => webMonitors.id),
  type: text("type").notNull(), // 'cpu', 'memory', 'storage', 'uptime'
  value: real("value").notNull(),
  threshold: real("threshold").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
});

// === DATABASE AGENT ===
export const databases = pgTable("databases", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // Identifier
  engine: text("engine"), // Postgres, MySQL, etc.
  version: text("version"),
  host: text("host"),
  port: integer("port"),
  projectId: integer("project_id").references(() => projects.id),
  lastSeen: timestamp("last_seen").defaultNow(),
});

export const databaseMetrics = pgTable("database_metrics", {
  id: serial("id").primaryKey(),
  databaseId: integer("database_id").references(() => databases.id),
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
  projectId: integer("project_id").references(() => projects.id),
  lastSeen: timestamp("last_seen").defaultNow(),
});

export const clusterMetrics = pgTable("cluster_metrics", {
  id: serial("id").primaryKey(),
  clusterId: integer("cluster_id").references(() => clusters.id),
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
  projectId: integer("project_id").references(() => projects.id),
  lastStatus: text("last_status"), // 'up', 'down', 'unknown'
  sslStatus: text("ssl_status"), // 'valid', 'expiring', 'expired', 'invalid'
  sslExpiryDate: timestamp("ssl_expiry_date"),
  lastCheck: timestamp("last_check"),
  nextCheck: timestamp("next_check"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const webMonitorMetrics = pgTable("web_monitor_metrics", {
  id: serial("id").primaryKey(),
  monitorId: integer("monitor_id").references(() => webMonitors.id),
  responseTime: integer("response_time"), // in ms
  status: integer("status"), // HTTP status code
  isUp: boolean("is_up").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===
export const projectsRelations = relations(projects, ({ many, one }) => ({
  servers: many(servers),
  databases: many(databases),
  clusters: many(clusters),
  webMonitors: many(webMonitors),
  tokens: many(tokens),
  alertSettings: one(projectAlertSettings, {
    fields: [projects.id],
    references: [projectAlertSettings.projectId],
  }),
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
export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true, sentAt: true });

export const insertDatabaseSchema = createInsertSchema(databases).omit({ id: true, lastSeen: true });
export const insertDatabaseMetricSchema = createInsertSchema(databaseMetrics).omit({ id: true, createdAt: true });

export const insertClusterSchema = createInsertSchema(clusters).omit({ id: true, lastSeen: true });
export const insertClusterMetricSchema = createInsertSchema(clusterMetrics).omit({ id: true, createdAt: true });

export const insertWebMonitorSchema = createInsertSchema(webMonitors).omit({ id: true, createdAt: true, lastCheck: true, nextCheck: true, lastStatus: true, sslStatus: true, sslExpiryDate: true });
export const insertWebMonitorMetricSchema = createInsertSchema(webMonitorMetrics).omit({ id: true, createdAt: true });

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

// For internal service updates (full object but optional fields)
export type WebMonitorUpdate = Partial<WebMonitor>;
