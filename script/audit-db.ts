import pg from 'pg';
const { Client } = pg;

async function main() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    console.log("Auditing all tables for 'is_admin' column...");

    const res = await client.query(`
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE column_name = 'is_admin'
    `);

    if (res.rowCount === 0) {
        console.log("No 'is_admin' column found in any table.");
    } else {
        console.log("Found 'is_admin' column in:");
        res.rows.forEach(row => console.log(`- Table: ${row.table_name}`));
    }

    await client.end();
}

main().catch(console.error);
