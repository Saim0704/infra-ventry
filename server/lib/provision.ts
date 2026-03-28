import pg from "pg";
import { log, error } from "../lib/logger";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

export async function createTenantDatabase(dbName: string) {
  const { Pool } = pg;
  
  // Connect to postgres to CREATE DATABASE
  const url = new URL(process.env.DATABASE_URL!);
  const currentDb = url.pathname.substring(1);
  url.pathname = "/postgres"; // Root DB
  
  const pool = new Pool({ connectionString: url.toString() });
  const client = await pool.connect();
  
  try {
    log(`[Provision] Checking if database ${dbName} exists...`, "provision");
    const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
    
    if (res.rowCount === 0) {
      log(`[Provision] Creating database: ${dbName}`, "provision");
      // CREATE DATABASE cannot be run in a transation or with parameters safely in some drivers, 
      // but in pg it MUST be run outside of a transaction.
      await client.query(`CREATE DATABASE "${dbName}"`);
      log(`[Provision] Database ${dbName} created successfully.`, "provision");
      
      // RUN MIGRATIONS
      // We'll spawn `drizzle-kit push` pointing to the NEW DB
      log(`[Provision] Initializing schema for ${dbName}...`, "provision");
      const tenantUrl = new URL(process.env.DATABASE_URL!);
      tenantUrl.pathname = `/${dbName}`;
      
      const { stderr } = await execPromise(`DATABASE_URL=${tenantUrl.toString()} npx drizzle-kit push`, {
        cwd: process.cwd(),
      });
      
      if (stderr && stderr.includes("Error")) {
          error(`[Provision] Schema push error: ${stderr}`, "provision");
      } else {
          log(`[Provision] Schema pushed to ${dbName}.`, "provision");
      }
    } else {
      log(`[Provision] Database ${dbName} already exists.`, "provision");
    }
  } catch (err: any) {
    error(`[Provision] FAILED to create/provision database ${dbName}: ${err.message}`, "provision");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}
