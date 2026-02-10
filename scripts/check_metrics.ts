
import { db } from "../server/db";
import { serverMetrics, servers } from "../shared/schema";
import { sql } from "drizzle-orm";

async function checkMetrics() {
    console.log("Checking DB...");
    try {
        const serverCount = await db.select({ count: sql<number>`count(*)` }).from(servers);
        console.log(`Server Count: ${serverCount[0].count}`);

        const metricCount = await db.select({ count: sql<number>`count(*)` }).from(serverMetrics);
        console.log(`Metric Count: ${metricCount[0].count}`);

        if (Number(metricCount[0].count) > 0) {
            const metrics = await db.select().from(serverMetrics).limit(5);
            console.log("Recent Metrics Sample:", JSON.stringify(metrics, null, 2));
        } else {
            console.log("No metrics found.");
        }
    } catch (err) {
        console.error("Error querying DB:", err);
    }
    process.exit(0);
}

checkMetrics().catch(console.error);
