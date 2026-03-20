import { storage } from "../server/storage";
import { db } from "../server/db";
import { projects, projectAlertSettings, servers } from "../shared/schema";
import { eq } from "drizzle-orm";

(async () => {
    const [project] = await db.select().from(projects).where(eq(projects.name, "BigOh"));
    if (!project) {
        console.log("Project BigOh not found");
        process.exit(1);
    }
    const [settings] = await db.select().from(projectAlertSettings).where(eq(projectAlertSettings.projectId, project.id));
    console.log("Settings for BigOh:", JSON.stringify(settings, null, 2));

    const srvs = await storage.getServers();
    const bigOhSrvs = srvs.filter(s => s.projectId === project.id);
    console.log("Servers for BigOh:", bigOhSrvs.map(s => ({ id: s.id, hostname: s.hostname, version: s.agentVersion, projectId: s.projectId })));

    process.exit(0);
})();
