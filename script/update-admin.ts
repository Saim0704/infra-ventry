import { db } from "../server/db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("Updating admin user...");
    await db.update(users)
        .set({
            email: "admin@example.com",
            firstName: "System",
            lastName: "Administrator"
        })
        .where(eq(users.username, "admin"));
    console.log("Update complete.");
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
