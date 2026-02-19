import { db } from "../server/db";
import { projects } from "../shared/schema";
import { eq } from "drizzle-orm";

async function migrate() {
    console.log("Migrating projects to include slugs...");
    const allProjects = await db.select().from(projects);

    for (const project of allProjects) {
        if (!project.slug) {
            const slug = project.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
            console.log(`Updating project ${project.name} with slug: ${slug}`);
            await db.update(projects).set({ slug }).where(eq(projects.id, project.id));
        }
    }
    console.log("Migration complete.");
}

migrate().catch(console.error);
