import pg from 'pg';
const { Client } = pg;

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });
    await client.connect();
    console.log("Connected to database.");

    try {
        console.log("Creating 'project_alert_settings' table...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS project_alert_settings (
                id SERIAL PRIMARY KEY,
                project_id INTEGER NOT NULL UNIQUE REFERENCES projects(id),
                alert_recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
                company_name TEXT,
                logo_url TEXT,
                cpu_threshold REAL DEFAULT 80,
                memory_threshold REAL DEFAULT 80,
                storage_threshold REAL DEFAULT 80,
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        console.log("Table 'project_alert_settings' created successfully.");
    } catch (err) {
        console.error("Error creating table:", err);
    } finally {
        await client.end();
        process.exit(0);
    }
}

main();
