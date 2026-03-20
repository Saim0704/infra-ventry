import { storage } from "../server/storage";
import { db } from "../server/db";
import { projects } from "../shared/schema";

(async () => {
    const all = await db.select().from(projects);
    console.log("Projects:", JSON.stringify(all, null, 2));

    const [settings] = await storage.getServers();
    console.log("Servers count:", settings.length);
    if (settings.length > 0) {
        console.log("First server:", JSON.stringify(settings[0], null, 2));
    }

    process.exit(0);
})();
