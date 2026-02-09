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

// === USERS (Replit Auth) ===
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === AGENT TOKENS ===
export const tokens = pgTable("tokens", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // e.g., "Production VM Agent"
  token: text("token").notNull().unique(),
  type: text("type").notNull(), // "vm", "database", "kubernetes"
  createdAt: timestamp("created_at").defaultNow(),
});

// === VM AGENT ===
export const servers = pgTable("servers", {
  id: serial("id").primaryKey(),
  hostname: text("hostname").notNull().unique(),
  os: text("os"),
  cpuCores: integer("cpu_cores"),
  totalRam: real("total_ram"), // in GB
  totalDisk: real("total_disk"), // in GB
  ipAddress: text("ip_address"),
  osVersion: text("os_version"),
  sshUser: text("ssh_user"),
  sshKey: text("ssh_key"),
  lastSeen: timestamp("last_seen").defaultNow(),
});

export const serverMetrics = pgTable("server_metrics", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").references(() => servers.id),
  cpuUsage: real("cpu_usage"), // %
  memoryUsage: real("memory_usage"), // %
  diskUsage: real("disk_usage"), // %
  createdAt: timestamp("created_at").defaultNow(),
});

// === DATABASE AGENT ===
export const databases = pgTable("databases", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // Identifier
  engine: text("engine"), // Postgres, MySQL, etc.
  version: text("version"),
  host: text("host"),
  port: integer("port"),
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

// === RELATIONS ===
export const serversRelations = relations(servers, ({ many }) => ({
  metrics: many(serverMetrics),
}));

export const serverMetricsRelations = relations(serverMetrics, ({ one }) => ({
  server: one(servers, {
    fields: [serverMetrics.serverId],
    references: [servers.id],
  }),
}));

export const databasesRelations = relations(databases, ({ many }) => ({
  metrics: many(databaseMetrics),
}));

export const databaseMetricsRelations = relations(databaseMetrics, ({ one }) => ({
  database: one(databases, {
    fields: [databaseMetrics.databaseId],
    references: [databases.id],
  }),
}));

export const clustersRelations = relations(clusters, ({ many }) => ({
  metrics: many(clusterMetrics),
}));

export const clusterMetricsRelations = relations(clusterMetrics, ({ one }) => ({
  cluster: one(clusters, {
    fields: [clusterMetrics.clusterId],
    references: [clusters.id],
  }),
}));


// === ZOD SCHEMAS ===
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTokenSchema = createInsertSchema(tokens).omit({ id: true, createdAt: true });

export const insertServerSchema = createInsertSchema(servers).omit({ id: true, lastSeen: true });
export const insertServerMetricSchema = createInsertSchema(serverMetrics).omit({ id: true, createdAt: true });

export const insertDatabaseSchema = createInsertSchema(databases).omit({ id: true, lastSeen: true });
export const insertDatabaseMetricSchema = createInsertSchema(databaseMetrics).omit({ id: true, createdAt: true });

export const insertClusterSchema = createInsertSchema(clusters).omit({ id: true, lastSeen: true });
export const insertClusterMetricSchema = createInsertSchema(clusterMetrics).omit({ id: true, createdAt: true });

// Form Schema for Manual Server Entry
export const serverWithMetricsSchema = z.object({
  hostname: z.string().min(1, "Hostname is required"),
  ipAddress: z.string().optional(),
  os: z.string().optional(),
  osVersion: z.string().optional(),
  cpuCores: z.number().int().min(1, "CPU Cores must be at least 1"),
  totalRam: z.number().min(0, "Total RAM must be positive"),
  totalDisk: z.number().min(0, "Total Disk must be positive"),
  sshUser: z.string().optional(),
  sshKey: z.string().optional(),
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
export type Server = typeof servers.$inferSelect;
export type ServerMetric = typeof serverMetrics.$inferSelect;
export type Database = typeof databases.$inferSelect;
export type DatabaseMetric = typeof databaseMetrics.$inferSelect;
export type Cluster = typeof clusters.$inferSelect;
export type ClusterMetric = typeof clusterMetrics.$inferSelect;
