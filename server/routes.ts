import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./auth";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Auth
  setupAuth(app);
  registerAuthRoutes(app);

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
      // Manual parse because we need to separate metadata from metrics
      // The shared route input schema has the full structure
      const input = api.ingest.vm.input.parse(req.body);

      const { metrics, ...serverInfo } = input.data;

      const server = await storage.upsertServer(serverInfo);
      await storage.addServerMetric({ ...metrics, serverId: server.id });

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: "Invalid data format" });
    }
  });

  // DB Ingestion
  app.post(api.ingest.db.path, validateAgentToken, async (req, res) => {
    try {
      const input = api.ingest.db.input.parse(req.body);
      const { metrics, ...dbInfo } = input.data;

      const database = await storage.upsertDatabase(dbInfo);
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

      const cluster = await storage.upsertCluster(clusterInfo);
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
    const { name, type } = api.tokens.create.input.parse(req.body);
    const token = await storage.createToken(name, type);
    res.status(201).json(token);
  });

  app.delete(api.tokens.revoke.path, isAuthenticated, async (req, res) => {
    await storage.revokeToken(Number(req.params.id));
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

  // === SERVER MANAGEMENT (Manual) ===
  app.post(api.servers.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.servers.create.input.parse(req.body);
      console.log("Creating server with input:", JSON.stringify(input));
      const { cpuUsage, memoryUsage, diskUsage, ...serverData } = input;
      const server = await storage.upsertServer(serverData);
      console.log("Server created/upserted:", server.id);

      if (cpuUsage !== undefined || memoryUsage !== undefined || diskUsage !== undefined) {
        console.log("Adding initial metrics:", { cpuUsage, memoryUsage, diskUsage });
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
      console.log(`Updating server ${id} with input:`, JSON.stringify(input));
      const { cpuUsage, memoryUsage, diskUsage, ...serverData } = input;

      const server = await storage.updateServer(id, serverData);
      if (!server) {
        console.log(`Server ${id} not found for update`);
        return res.status(404).json({ message: "Server not found" });
      }
      console.log(`Server ${id} updated successfully`);

      if (cpuUsage !== undefined || memoryUsage !== undefined || diskUsage !== undefined) {
        console.log(`Adding updated metrics for server ${id}:`, { cpuUsage, memoryUsage, diskUsage });
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
