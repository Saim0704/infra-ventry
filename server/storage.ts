import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import {
  users, tokens, servers, serverMetrics, databases, databaseMetrics, clusters, clusterMetrics, projects,
  type User, type Token, type Server, type ServerMetric, type Database, type DatabaseMetric, type Cluster, type ClusterMetric, type Project
} from "@shared/schema";
import { insertTokenSchema, insertServerSchema, insertServerMetricSchema, insertDatabaseSchema, insertDatabaseMetricSchema, insertClusterSchema, insertClusterMetricSchema, insertProjectSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";

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

  // === PROJECTS ===
  getProjects(): Promise<Project[]>;
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
  getDatabases(): Promise<Database[]>;
  getDatabase(id: number): Promise<(Database & { metrics: DatabaseMetric[] }) | undefined>;
  upsertDatabase(data: z.infer<typeof insertDatabaseSchema>): Promise<Database>;
  addDatabaseMetric(data: z.infer<typeof insertDatabaseMetricSchema>): Promise<void>;

  // === CLUSTERS ===
  getClusters(): Promise<Cluster[]>;
  getCluster(id: number): Promise<(Cluster & { metrics: ClusterMetric[] }) | undefined>;
  upsertCluster(data: z.infer<typeof insertClusterSchema>): Promise<Cluster>;
  addClusterMetric(data: z.infer<typeof insertClusterMetricSchema>): Promise<void>;

  // === USERS ===
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  createUser(data: z.infer<typeof insertUserSchema>): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
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
    const [project] = await db.insert(projects).values(data).returning();
    return project;
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
    const projectTokens = await this.getTokens(projectId);

    return {
      project,
      servers: allServers.filter(s => s.projectId === projectId),
      databases: allDbs.filter(d => d.projectId === projectId),
      clusters: allClusters.filter(c => c.projectId === projectId),
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
  }

  // === DATABASES ===
  async getDatabases(): Promise<(Database & { project?: Project })[]> {
    const allDbs = await db.select().from(databases).orderBy(desc(databases.lastSeen));
    return await Promise.all(allDbs.map(async (dbItem) => {
      let project;
      if (dbItem.projectId) {
        [project] = await db.select().from(projects).where(eq(projects.id, dbItem.projectId));
      }
      return { ...dbItem, project };
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

  async addDatabaseMetric(data: z.infer<typeof insertDatabaseMetricSchema>): Promise<void> {
    await db.insert(databaseMetrics).values(data);
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
}

export const storage = new DatabaseStorage();
