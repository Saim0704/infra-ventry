import os from "os";
import axios from "axios";
import { execSync } from "child_process";

/**
 * Infrawatch Agent
 * 
 * Collects system metrics and reports them to the Infrawatch server at regular intervals.
 */

const SERVER_URL = process.env.SERVER_URL || "http://localhost:3000";
const AGENT_TOKEN = process.env.AGENT_TOKEN || "infra_inventory_agent_secret_2026";
const INTERVAL = parseInt(process.env.INTERVAL || "60000", 10);

/**
 * Get internal IP address (non-loopback)
 */
function getIpAddress(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const ifaceArray = interfaces[name];
    if (ifaceArray) {
      for (const iface of ifaceArray) {
        if (iface.family === "IPv4" && !iface.internal) {
          return iface.address;
        }
      }
    }
  }
  return "127.0.0.1";
}

/**
 * Get Disk Stats (Total and Usage Percentage)
 */
function getDiskStats(): { total: number; usage: number } {
  try {
    // Works on Mac and Linux
    const output = execSync("df -k / | awk 'NR==2 {print $2, $5}'").toString().trim();
    const [totalK, usagePct] = output.split(/\s+/);
    return {
      total: parseFloat(totalK) / (1024 * 1024), // GB
      usage: parseInt(usagePct.replace("%", ""), 10)
    };
  } catch (e) {
    return { total: 0, usage: 0 };
  }
}

/**
 * Get Top 5 Processes by CPU
 */
function getTopProcesses(): any[] {
  try {
    const platform = os.platform();
    if (platform === "darwin") {
      // Mac
      const output = execSync("ps -aco pid,command,%cpu,%mem -r | head -n 6 | tail -n 5").toString().trim();
      return output.split("\n").map(line => {
        const parts = line.trim().split(/\s+/);
        return {
          pid: parseInt(parts[0], 10),
          name: parts[1],
          cpu: parseFloat(parts[2]),
          memory: parseFloat(parts[3])
        };
      });
    } else {
      // Linux
      const output = execSync("ps aux --sort=-%cpu | awk 'NR>1 && NR<=6 {print $2, $11, $3, $4}'").toString().trim();
      return output.split("\n").map(line => {
        const parts = line.trim().split(/\s+/);
        return {
          pid: parseInt(parts[0], 10),
          name: parts[1].split("/").pop() || parts[1],
          cpu: parseFloat(parts[2]),
          memory: parseFloat(parts[3])
        };
      });
    }
  } catch (e) {
    return [];
  }
}

/**
 * Collect all metrics
 */
async function collectStats() {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const disk = getDiskStats();
  
  // CPU Usage: loadavg is a 1, 5, 15 min average. 
  // For a more immediate but rough measure:
  const load = os.loadavg();
  const cpuUsage = Math.min(100, (load[0] / cpus.length) * 100);

  return {
    hostname: os.hostname(),
    os: `${os.type()} ${os.release()}`,
    cpuCores: cpus.length,
    totalRam: totalMem / (1024 * 1024 * 1024),
    totalDisk: disk.total,
    ipAddress: getIpAddress(),
    metrics: {
      cpuUsage: Math.round(cpuUsage * 10) / 10,
      memoryUsage: Math.round(((totalMem - freeMem) / totalMem) * 1000) / 10,
      diskUsage: disk.usage,
      topProcesses: getTopProcesses()
    }
  };
}

/**
 * Send stats to server
 */
async function report() {
  try {
    const stats = await collectStats();
    console.log(`[${new Date().toISOString()}] Reporting metrics for ${stats.hostname}...`);
    
    await axios.post(`${SERVER_URL}/api/ingest/vm`, {
      token: AGENT_TOKEN,
      data: stats
    });
    
    console.log(`[${new Date().toISOString()}] Successfully reported.`);
  } catch (error: any) {
    const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`[${new Date().toISOString()}] Failed to report metrics: ${errorMsg}`);
  }
}

// Start reporting
console.log("-----------------------------------------");
console.log("Infrawatch Agent Started");
console.log(`Server: ${SERVER_URL}`);
console.log(`Interval: ${INTERVAL / 1000}s`);
console.log("-----------------------------------------");

report();
setInterval(report, INTERVAL);
