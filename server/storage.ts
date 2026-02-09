import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import {
  users, tokens, servers, serverMetrics, databases, databaseMetrics, clusters, clusterMetrics,
  type User, type Token, type Server, type ServerMetric, type Database, type DatabaseMetric, type Cluster, type ClusterMetric
} from "@shared/schema";
import { insertTokenSchema, insertServerSchema, insertServerMetricSchema, insertDatabaseSchema, insertDatabaseMetricSchema, insertClusterSchema, insertClusterMetricSchema } from "@shared/schema";
import { z } from "zod";

export interface IStorage {
  // === TOKENS ===
  getTokens(): Promise<Token[]>;
  createToken(name: string, type: string): Promise<Token>;
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

  // === SERVERS ===
  getServers(): Promise<Server[]>;
  getServer(id: number): Promise<(Server & { metrics: ServerMetric[] }) | undefined>;
  upsertServer(data: z.infer<typeof insertServerSchema>): Promise<Server>;
  addServerMetric(data: z.infer<typeof insertServerMetricSchema>): Promise<void>;

  // === DATABASES ===
  getDatabases(): Promise<Database[]>;
  getDatabase(id: number): Promise<(Database & { metrics: DatabaseMetric[] }) | undefined>;
  upsertDatabase(data: z.infer<typeof insertDatabaseSchema>): Promise<Database>;
  addDatabaseMetric(data: z.infer<typeof insertDatabaseMetricSchema>): Promise<void>;

  // === CLUSTERS ===
  getClusters(): Promise<Cluster[]>;
  getCluster(id: number): Promise<(Cluster & { metrics: ClusterMetric[] }) | undefined>;
  upsertCluster(data: z.infer<typeof insertClusterSchema>): Promise<Cluster>;
  addClusterMetric(data: z.infer<typeof insertClusterMetricSchema>): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // === TOKENS ===
  async getTokens(): Promise<Token[]> {
    return await db.select().from(tokens);
  }

  async createToken(name: string, type: string): Promise<Token> {
    // Generate a random token
    const tokenStr = `ag_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
    const [token] = await db.insert(tokens).values({ name, type, token: tokenStr }).returning();
    return token;
  }

  async validateToken(tokenStr: string): Promise<boolean> {
    const [token] = await db.select().from(tokens).where(eq(tokens.token, tokenStr));
    return !!token;
  }

  async revokeToken(id: number): Promise<void> {
    await db.delete(tokens).where(eq(tokens.id, id));
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

    // Mock critical count for now, or fetch simple status
    // To make it real, we'd need to join with metrics.
    return {
      totalServers: Number(serverCount[0].count),
      totalDatabases: Number(dbCount[0].count),
      totalClusters: Number(clusterCount[0].count),
      healthyServers: Number(serverCount[0].count), // Assume healthy for MVP
      criticalServers: 0,
    };
  }

  // === SERVERS ===
  async getServers(): Promise<Server[]> {
    return await db.select().from(servers).orderBy(desc(servers.lastSeen));
  }

  async getServer(id: number): Promise<(Server & { metrics: ServerMetric[] }) | undefined> {
    const [server] = await db.select().from(servers).where(eq(servers.id, id));
    if (!server) return undefined;

    const metrics = await db.select().from(serverMetrics)
      .where(eq(serverMetrics.serverId, id))
      .orderBy(desc(serverMetrics.createdAt))
      .limit(50); // Last 50 data points

    return { ...server, metrics: metrics.reverse() }; // Return chronological
  }

  async upsertServer(data: z.infer<typeof insertServerSchema>): Promise<Server> {
    const [server] = await db.insert(servers)
      .values({ ...data, lastSeen: new Date() })
      .onConflictDoUpdate({
        target: servers.hostname,
        set: { ...data, lastSeen: new Date() }
      })
      .returning();
    return server;
  }

  async addServerMetric(data: z.infer<typeof insertServerMetricSchema>): Promise<void> {
    await db.insert(serverMetrics).values(data);
  }

  // === DATABASES ===
  async getDatabases(): Promise<Database[]> {
    return await db.select().from(databases).orderBy(desc(databases.lastSeen));
  }

  async getDatabase(id: number): Promise<(Database & { metrics: DatabaseMetric[] }) | undefined> {
    const [database] = await db.select().from(databases).where(eq(databases.id, id));
    if (!database) return undefined;

    const metrics = await db.select().from(databaseMetrics)
      .where(eq(databaseMetrics.databaseId, id))
      .orderBy(desc(databaseMetrics.createdAt))
      .limit(50);

    return { ...database, metrics: metrics.reverse() };
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

  async addDatabaseMetric(data: z.infer<typeof insertDatabaseMetricSchema>): Promise<void> {
    await db.insert(databaseMetrics).values(data);
  }

  // === CLUSTERS ===
  async getClusters(): Promise<Cluster[]> {
    return await db.select().from(clusters).orderBy(desc(clusters.lastSeen));
  }

  async getCluster(id: number): Promise<(Cluster & { metrics: ClusterMetric[] }) | undefined> {
    const [cluster] = await db.select().from(clusters).where(eq(clusters.id, id));
    if (!cluster) return undefined;

    const metrics = await db.select().from(clusterMetrics)
      .where(eq(clusterMetrics.clusterId, id))
      .orderBy(desc(clusterMetrics.createdAt))
      .limit(50);

    return { ...cluster, metrics: metrics.reverse() };
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
  }
}

export const storage = new DatabaseStorage();
