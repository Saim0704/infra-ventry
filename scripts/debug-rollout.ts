import { storage } from "../server/storage";

(async () => {
    const servers = await storage.getServers();
    console.log("Servers status:");
    servers.forEach((s: any) => {
        console.log(`[${s.id}] ${s.hostname} v:${s.agentVersion} pending:${s.pendingUpdate}`);
    });
    process.exit(0);
})();
