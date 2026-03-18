import { storage } from "./server/storage";

async function check() {
  const servers = await storage.getServers();
  console.log("Servers OS Info:");
  servers.forEach(s => {
    console.log(`- ${s.hostname}: OS="${s.os}", Version="${s.osVersion}"`);
  });
  process.exit(0);
}

check();
