import { Pool } from 'pg';

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error('DATABASE_URL is not set in process.env');
    console.log('Please run this script with --env-file=.env or set the environment variable.');
    process.exit(1);
}

async function cleanup() {
    console.log('Connecting to database...');
    const pool = new Pool({ connectionString: dbUrl });

    try {
        console.log('Cleaning up orphaned records...');

        // 1. ALERTS
        const alertsResult = await pool.query(`
            DELETE FROM alerts a 
            WHERE (server_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM servers s WHERE s.id = a.server_id))
               OR (database_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM databases d WHERE d.id = a.database_id))
               OR (cluster_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM clusters c WHERE c.id = a.cluster_id))
               OR (web_monitor_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM web_monitors w WHERE w.id = a.web_monitor_id))
               OR (domain_monitor_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM domain_monitors d WHERE d.id = a.domain_monitor_id))
            RETURNING id;
        `);
        console.log(`Deleted ${alertsResult.rowCount} orphaned alerts.`);

        // 2. SERVER METRICS
        const serverMetricsResult = await pool.query(`
            DELETE FROM server_metrics m 
            WHERE server_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM servers s WHERE s.id = m.server_id)
            RETURNING id;
        `);
        console.log(`Deleted ${serverMetricsResult.rowCount} orphaned server metrics.`);

        // 3. DATABASE METRICS
        const dbMetricsResult = await pool.query(`
            DELETE FROM database_metrics m 
            WHERE database_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM databases d WHERE d.id = m.database_id)
            RETURNING id;
        `);
        console.log(`Deleted ${dbMetricsResult.rowCount} orphaned database metrics.`);

        // 4. CLUSTER METRICS
        const clusterMetricsResult = await pool.query(`
            DELETE FROM cluster_metrics m 
            WHERE cluster_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM clusters c WHERE c.id = m.cluster_id)
            RETURNING id;
        `);
        console.log(`Deleted ${clusterMetricsResult.rowCount} orphaned cluster metrics.`);

        // 5. WEB MONITOR METRICS
        const webMetricsResult = await pool.query(`
            DELETE FROM web_monitor_metrics m 
            WHERE monitor_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM web_monitors w WHERE w.id = m.monitor_id)
            RETURNING id;
        `);
        console.log(`Deleted ${webMetricsResult.rowCount} orphaned web monitor metrics.`);

        // 6. TOKENS
        const tokensResult = await pool.query(`
            DELETE FROM tokens t 
            WHERE project_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = t.project_id)
            RETURNING id;
        `);
        console.log(`Deleted ${tokensResult.rowCount} orphaned tokens.`);

        console.log('Cleanup complete! You can now retry npm run db:push');

    } catch (err) {
        console.error('Error during cleanup:', err);
    } finally {
        await pool.end();
    }
}

cleanup();
