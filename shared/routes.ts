import { z } from 'zod';
import {
  insertTokenSchema,
  tokens,
  servers,
  serverMetrics,
  serverWithMetricsSchema,
  databases,
  databaseMetrics,
  clusters,
  clusterMetrics,
  projects,
  insertProjectSchema,
  insertDatabaseSchema,
  insertWebMonitorSchema,
  webMonitors,
  webMonitorMetrics
} from './schema';

// Shared error schemas
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  // === TOKENS (for UI) ===
  tokens: {
    list: {
      method: 'GET' as const,
      path: '/api/tokens' as const,
      responses: {
        200: z.array(z.custom<typeof tokens.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/tokens' as const,
      input: insertTokenSchema,
      responses: {
        201: z.custom<typeof tokens.$inferSelect>(),
      },
    },
    revoke: {
      method: 'DELETE' as const,
      path: '/api/tokens/:id' as const,
      responses: {
        204: z.void(),
      },
    },
  },

  // === PROJECTS ===
  projects: {
    list: {
      method: 'GET' as const,
      path: '/api/projects' as const,
      responses: {
        200: z.array(z.custom<typeof projects.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/projects' as const,
      input: insertProjectSchema,
      responses: {
        201: z.custom<typeof projects.$inferSelect>(),
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/projects/:id' as const,
      input: insertProjectSchema.partial(),
      responses: {
        200: z.custom<typeof projects.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/projects/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    resources: {
      method: 'GET' as const,
      path: '/api/projects/:id/resources' as const,
      responses: {
        200: z.object({
          project: z.custom<typeof projects.$inferSelect>(),
          servers: z.array(z.custom<typeof servers.$inferSelect & { metrics: any[] }>()),
          databases: z.array(z.custom<typeof databases.$inferSelect>()),
          clusters: z.array(z.custom<typeof clusters.$inferSelect>()),
          webMonitors: z.array(z.custom<typeof webMonitors.$inferSelect & { metrics: any[] }>()),
          tokens: z.array(z.custom<typeof tokens.$inferSelect>()),
        }),
        404: errorSchemas.notFound,
      },
    },
    status: {
      method: 'GET' as const,
      path: '/api/status/:slug' as const,
      responses: {
        200: z.object({
          project: z.object({
            name: z.string(),
            description: z.string().nullable(),
          }),
          servers: z.array(z.object({
            name: z.string(),
            status: z.string(),
            lastSeen: z.string().nullable(),
          })),
          databases: z.array(z.object({
            name: z.string(),
            status: z.string(),
            lastSeen: z.string().nullable(),
          })),
          webMonitors: z.array(z.object({
            name: z.string(),
            url: z.string(),
            status: z.string(),
            lastCheck: z.string().nullable(),
            responseTime: z.number().nullable(),
          })),
        }),
        404: errorSchemas.notFound,
      },
    },
  },

  // === DASHBOARD DATA ===
  dashboard: {
    stats: {
      method: 'GET' as const,
      path: '/api/stats' as const,
      responses: {
        200: z.object({
          totalServers: z.number(),
          totalDatabases: z.number(),
          totalClusters: z.number(),
          totalWebMonitors: z.number(),
          healthyServers: z.number(),
          criticalServers: z.number(), // Disk > 90% or offline
        }),
      },
    },
  },

  // === SERVERS ===
  servers: {
    list: {
      method: 'GET' as const,
      path: '/api/servers' as const,
      responses: {
        200: z.array(z.custom<typeof servers.$inferSelect & { metrics: typeof serverMetrics.$inferSelect[], project?: typeof projects.$inferSelect }>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/servers/:id' as const,
      responses: {
        200: z.custom<typeof servers.$inferSelect & { metrics: typeof serverMetrics.$inferSelect[], project?: typeof projects.$inferSelect }>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/servers' as const,
      input: serverWithMetricsSchema,
      responses: {
        201: z.custom<typeof servers.$inferSelect>(),
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/servers/:id' as const,
      input: serverWithMetricsSchema.partial(),
      responses: {
        200: z.custom<typeof servers.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/servers/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },

  // === DATABASES ===
  databases: {
    list: {
      method: 'GET' as const,
      path: '/api/databases' as const,
      responses: {
        200: z.array(z.custom<typeof databases.$inferSelect & { metrics: typeof databaseMetrics.$inferSelect[], project?: typeof projects.$inferSelect }>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/databases' as const,
      input: insertDatabaseSchema,
      responses: {
        201: z.custom<typeof databases.$inferSelect>(),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/databases/:id' as const,
      responses: {
        200: z.custom<typeof databases.$inferSelect & { metrics: typeof databaseMetrics.$inferSelect[] }>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/databases/:id' as const,
      input: z.object({
        name: z.string().optional(),
        host: z.string().optional(),
        port: z.number().optional(),
        engine: z.string().optional(),
        version: z.string().optional(),
        projectId: z.number().nullable().optional(),
      }),
      responses: {
        200: z.custom<typeof databases.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/databases/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },

  // === CLUSTERS ===
  clusters: {
    list: {
      method: 'GET' as const,
      path: '/api/clusters' as const,
      responses: {
        200: z.array(z.custom<typeof clusters.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/clusters/:id' as const,
      responses: {
        200: z.custom<typeof clusters.$inferSelect & { metrics: typeof clusterMetrics.$inferSelect[] }>(),
        404: errorSchemas.notFound,
      },
    },
  },

  // === WEB MONITORS ===
  webMonitors: {
    list: {
      method: 'GET' as const,
      path: '/api/web-monitors' as const,
      responses: {
        200: z.array(z.custom<typeof webMonitors.$inferSelect & { metrics: typeof webMonitorMetrics.$inferSelect[], project?: typeof projects.$inferSelect }>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/web-monitors/:id' as const,
      responses: {
        200: z.custom<typeof webMonitors.$inferSelect & { metrics: typeof webMonitorMetrics.$inferSelect[] }>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/web-monitors' as const,
      input: insertWebMonitorSchema,
      responses: {
        201: z.custom<typeof webMonitors.$inferSelect>(),
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/web-monitors/:id' as const,
      input: insertWebMonitorSchema.partial(),
      responses: {
        200: z.custom<typeof webMonitors.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/web-monitors/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },

  // === INGESTION (Used by Agents) ===
  ingest: {
    vm: {
      method: 'POST' as const,
      path: '/api/ingest/vm' as const,
      input: z.object({
        token: z.string(),
        data: z.object({
          hostname: z.string(),
          os: z.string().optional(),
          cpuCores: z.number().optional(),
          totalRam: z.number().optional(),
          totalDisk: z.number().optional(),
          ipAddress: z.string().optional(),
          metrics: z.object({
            cpuUsage: z.number(),
            memoryUsage: z.number(),
            diskUsage: z.number(),
            topProcesses: z.array(z.object({
              pid: z.number(),
              name: z.string(),
              cpu: z.number(),
              memory: z.number(),
            })).optional(),
          }),
        }),
      }),
      responses: {
        200: z.object({ success: z.boolean() }),
        401: errorSchemas.unauthorized,
      },
    },
    db: {
      method: 'POST' as const,
      path: '/api/ingest/db' as const,
      input: z.object({
        token: z.string(),
        data: z.object({
          name: z.string(),
          engine: z.string(),
          version: z.string().optional(),
          host: z.string().optional(),
          port: z.number().optional(),
          metrics: z.object({
            storageUsed: z.number(),
            activeConnections: z.number(),
          }),
        }),
      }),
      responses: {
        200: z.object({ success: z.boolean() }),
        401: errorSchemas.unauthorized,
      },
    },
    k8s: {
      method: 'POST' as const,
      path: '/api/ingest/k8s' as const,
      input: z.object({
        token: z.string(),
        data: z.object({
          name: z.string(),
          version: z.string().optional(),
          nodeCount: z.number().optional(),
          totalCpu: z.number().optional(),
          totalMemory: z.number().optional(),
          metrics: z.object({
            cpuUsage: z.number(),
            memoryUsage: z.number(),
            podCount: z.number(),
          }),
        }),
      }),
      responses: {
        200: z.object({ success: z.boolean() }),
        401: errorSchemas.unauthorized,
      },
    },
  },

  // === SETTINGS ===
  settings: {
    smtp: {
      get: {
        method: 'GET' as const,
        path: '/api/settings/smtp' as const,
        responses: {
          200: z.custom<any>(), // SmtpSettings
          404: errorSchemas.notFound,
        },
      },
      upsert: {
        method: 'PATCH' as const,
        path: '/api/settings/smtp' as const,
        input: z.object({
          host: z.string().min(1, "Host is required"),
          port: z.number().int().min(1, "Port is required"),
          user: z.string().min(1, "User is required"),
          pass: z.string().min(1, "Password is required"),
          fromEmail: z.string().email("Invalid from email"),
        }),
        responses: {
          200: z.custom<any>(),
        },
      },
      test: {
        method: 'POST' as const,
        path: '/api/settings/smtp/test' as const,
        input: z.object({
          recipient: z.string().email("Invalid recipient email"),
          settings: z.object({
            host: z.string().min(1, "Host is required"),
            port: z.number().int().min(1, "Port is required"),
            user: z.string().min(1, "User is required"),
            pass: z.string().min(1, "Password is required"),
            fromEmail: z.string().email("Invalid from email"),
          }).optional(),
        }),
        responses: {
          200: z.object({ success: z.boolean(), message: z.string().optional() }),
          400: z.object({ message: z.string() }),
        },
      },
    },
    projectAlerts: {
      get: {
        method: 'GET' as const,
        path: '/api/projects/:id/alert-settings' as const,
        responses: {
          200: z.custom<any>(),
          404: errorSchemas.notFound,
        },
      },
      update: {
        method: 'PATCH' as const,
        path: '/api/projects/:id/alert-settings' as const,
        input: z.object({
          alertRecipients: z.array(z.string().email("Invalid alert email")).optional(),
          companyName: z.string().nullable().optional(),
          logoUrl: z.string().nullable().optional(),
          cpuThreshold: z.number().min(0).max(100).nullable().optional(),
          memoryThreshold: z.number().min(0).max(100).nullable().optional(),
          storageThreshold: z.number().min(0).max(100).nullable().optional(),
        }),
        responses: {
          200: z.custom<any>(),
          404: errorSchemas.notFound,
        },
      },
    },
  },

  // === ALERTS ===
  alerts: {
    list: {
      method: 'GET' as const,
      path: '/api/servers/:serverId/alerts' as const,
      responses: {
        200: z.array(z.custom<any>()), // Alert[]
      },
    },
    history: {
      method: 'GET' as const,
      path: '/api/alerts/history' as const,
      responses: {
        200: z.array(z.custom<any>()), // Alert[] with server info
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
