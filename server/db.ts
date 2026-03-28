import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

// Pool cache for tenant databases
const tenantPools: Record<string, pg.Pool> = {};

export function getTenantDb(dbName: string) {
  if (!tenantPools[dbName]) {
    // Replace current database name in connection string if we use the same host
    const url = new URL(process.env.DATABASE_URL!);
    url.pathname = `/${dbName}`;
    
    tenantPools[dbName] = new Pool({ connectionString: url.toString() });
    log(`[DB] Created new pool for database: ${dbName}`, "db");
  }
  
  return drizzle(tenantPools[dbName], { schema });
}

import { log } from "./lib/logger";
