import { db } from "../server/db";
import { projectAlertSettings, projects } from "../shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  const allSettings = await db.select().from(projectAlertSettings);
  console.log(JSON.stringify(allSettings, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
