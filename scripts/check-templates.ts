import { db } from "../server/db";
import { projectEmailTemplates } from "../shared/schema";

async function main() {
  const allTemplates = await db.select().from(projectEmailTemplates);
  console.log(JSON.stringify(allTemplates, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
