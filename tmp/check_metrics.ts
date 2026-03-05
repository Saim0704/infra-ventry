
import { db } from "../server/db";
import { webMonitors, webMonitorMetrics } from "../shared/schema";
import { eq, desc } from "drizzle-orm";

async function main() {
    console.log("Checking Web Monitor Metrics...");
    const monitors = await db.select().from(webMonitors);
    console.log(`Found ${monitors.length} monitors.`);

    for (const monitor of monitors) {
        const metrics = await db.select().from(webMonitorMetrics)
            .where(eq(webMonitorMetrics.monitorId, monitor.id))
            .orderBy(desc(webMonitorMetrics.createdAt))
            .limit(5);

        console.log(`Monitor: ${monitor.name} (ID: ${monitor.id})`);
        console.log(`Metrics count (last 5): ${metrics.length}`);
        metrics.forEach(m => {
            console.log(` - ${m.createdAt}: ${m.isUp ? 'UP' : 'DOWN'} (${m.responseTime}ms)`);
        });
    }
}

main().catch(console.error).finally(() => process.exit(0));
