import pg from 'pg';
const { Client } = pg;

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });
    await client.connect();
    console.log("Connected to database.");

    try {
        console.log("Altering 'users' table...");
        await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;");
        await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;");
        await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'read' NOT NULL;");
        await client.query("UPDATE users SET role = 'admin' WHERE username = 'admin';");

        // Only drop if it exists
        const checkIsAdmin = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='is_admin';");
        if (checkIsAdmin.rowCount > 0) {
            console.log("Dropping 'is_admin' column...");
            await client.query("ALTER TABLE users DROP COLUMN is_admin;");
        }

        console.log("Updating admin user data...");
        await client.query("UPDATE users SET email = 'admin@example.com', first_name = 'System', last_name = 'Administrator' WHERE username = 'admin';");

        console.log("Database updated successfully.");
    } catch (err) {
        console.error("Error updating database:", err);
    } finally {
        await client.end();
        process.exit(0);
    }
}

main();
