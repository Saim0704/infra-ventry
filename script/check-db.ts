import pg from 'pg';
const { Client } = pg;

async function main() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'");
    console.log("Columns in 'users' table:");
    res.rows.forEach(row => console.log(`- ${row.column_name} (${row.data_type})`));
    await client.end();
}

main();
