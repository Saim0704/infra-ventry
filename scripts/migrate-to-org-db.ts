import { db, getTenantDb, pool } from "../server/db";
import { 
  organizations, projects, servers, serverMetrics, databases, databaseMetrics, clusters, 
  clusterMetrics, smtpSettings, alerts, projectAlertSettings, webMonitors, webMonitorMetrics, 
  domainMonitors, emailTemplates 
} from "../shared/schema";
import { eq, inArray } from "drizzle-orm";
import { createTenantDatabase } from "../server/lib/provision";
import { log, info, error } from "../server/lib/logger";

async function migrateOrg(orgId: number) {
  // 1. Get Org Info
  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
  if (!org) {
    error(`Organization ${orgId} not found`);
    return;
  }

  // 2. Generate new DB name
  const createdAt = org.createdAt ? new Date(org.createdAt) : new Date();
  const dateStr = createdAt.toISOString().split('T')[0].replace(/-/g, '');
  const dbSlug = org.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const dbName = `${dbSlug}_${dateStr}`;
  
  info(`Provisioning database ${dbName} for ${org.name}...`);
  await createTenantDatabase(dbName);

  // 3. Connect to Tenant DB
  const tenantDb = getTenantDb(dbName);

  // 4. Data Migration (Transactional flow)
  try {
    info(`Migrating data for org ${orgId} (${org.name}) to ${dbName}...`);
    
    // FIRST: Migrate the organization record itself to satisfy FKs
    await tenantDb.insert(organizations).values(org);
    info(`Migrated organization record.`);

    // FETCH ALL tenant-specific data
    const orgProjects = await db.select().from(projects).where(eq(projects.orgId, orgId));
    const projectIds = orgProjects.map(p => p.id);

    if (projectIds.length > 0) {
      // Re-map IDs for nested structures if serial IDs differ (but drizzle-kit push keeps schema identical)
      // Actually, we'll try to keep the IDs the same if possible (serial reset).
      // If the target DB is empty, we can manually insert the IDs.

      // PROJECTS
      info(`Migrating ${orgProjects.length} projects...`);
      await tenantDb.insert(projects).values(orgProjects);

      // SERVERS
      const orgServers = await db.select().from(servers).where(inArray(servers.projectId, projectIds));
      if (orgServers.length > 0) {
        info(`Migrating ${orgServers.length} servers...`);
        await tenantDb.insert(servers).values(orgServers);
        
        const serverIds = orgServers.map(s => s.id);
        const orgServerMetrics = await db.select().from(serverMetrics).where(inArray(serverMetrics.serverId, serverIds));
        if (orgServerMetrics.length > 0) {
          info(`Migrating ${orgServerMetrics.length} server metrics in batches...`);
          const chunkSize = 500;
          for (let i = 0; i < orgServerMetrics.length; i += chunkSize) {
            const chunk = orgServerMetrics.slice(i, i + chunkSize);
            await tenantDb.insert(serverMetrics).values(chunk);
          }
        }
      }

      // DATABASES
      const orgDatabases = await db.select().from(databases).where(inArray(databases.projectId, projectIds));
      if (orgDatabases.length > 0) {
        info(`Migrating ${orgDatabases.length} databases...`);
        await tenantDb.insert(databases).values(orgDatabases);
        
        const dbIds = orgDatabases.map(d => d.id);
        const orgDbMetrics = await db.select().from(databaseMetrics).where(inArray(databaseMetrics.databaseId, dbIds));
        if (orgDbMetrics.length > 0) {
          info(`Migrating ${orgDbMetrics.length} database metrics in batches...`);
          const chunkSize = 500;
          for (let i = 0; i < orgDbMetrics.length; i += chunkSize) {
            const chunk = orgDbMetrics.slice(i, i + chunkSize);
            await tenantDb.insert(databaseMetrics).values(chunk);
          }
        }
      }

      // CLUSTERS
      const orgClusters = await db.select().from(clusters).where(inArray(clusters.projectId, projectIds));
      if (orgClusters.length > 0) {
        info(`Migrating ${orgClusters.length} clusters...`);
        await tenantDb.insert(clusters).values(orgClusters);
        
        const clusterIds = orgClusters.map(c => c.id);
        const orgClustermetrics = await db.select().from(clusterMetrics).where(inArray(clusterMetrics.clusterId, clusterIds));
        if (orgClustermetrics.length > 0) {
          info(`Migrating ${orgClustermetrics.length} cluster metrics in batches...`);
          const chunkSize = 500;
          for (let i = 0; i < orgClustermetrics.length; i += chunkSize) {
            const chunk = orgClustermetrics.slice(i, i + chunkSize);
            await tenantDb.insert(clusterMetrics).values(chunk);
          }
        }
      }

      // ALERTS (Linked to resources)
      const serverIds = orgServers.map(s => s.id);
      const orgAlerts = await db.select().from(alerts).where(inArray(alerts.serverId, serverIds));
      if (orgAlerts.length > 0) {
          info(`Migrating ${orgAlerts.length} alerts in batches...`);
          const chunkSize = 500;
          for (let i = 0; i < orgAlerts.length; i += chunkSize) {
            const chunk = orgAlerts.slice(i, i + chunkSize);
            await tenantDb.insert(alerts).values(chunk);
          }
      }

      const orgAlertSettings = await db.select().from(projectAlertSettings).where(inArray(projectAlertSettings.projectId, projectIds));
      if (orgAlertSettings.length > 0) {
          info(`Migrating ${orgAlertSettings.length} alert settings...`);
          await tenantDb.insert(projectAlertSettings).values(orgAlertSettings);
      }

      const orgWebMonitors = await db.select().from(webMonitors).where(inArray(webMonitors.projectId, projectIds));
      if (orgWebMonitors.length > 0) {
          info(`Migrating ${orgWebMonitors.length} web monitors...`);
          await tenantDb.insert(webMonitors).values(orgWebMonitors);
          const webMonitorIds = orgWebMonitors.map(w => w.id);
          const orgWebMetrics = await db.select().from(webMonitorMetrics).where(inArray(webMonitorMetrics.monitorId, webMonitorIds));
          if (orgWebMetrics.length > 0) {
            const chunkSize = 500;
            for (let i = 0; i < orgWebMetrics.length; i += chunkSize) {
              const chunk = orgWebMetrics.slice(i, i + chunkSize);
              await tenantDb.insert(webMonitorMetrics).values(chunk);
            }
          }
      }

      const orgDomainMonitors = await db.select().from(domainMonitors).where(inArray(domainMonitors.projectId, projectIds));
      if (orgDomainMonitors.length > 0) {
          info(`Migrating ${orgDomainMonitors.length} domain monitors...`);
          await tenantDb.insert(domainMonitors).values(orgDomainMonitors);
      }

      const orgSmtpSettings = await db.select().from(smtpSettings).where(eq(smtpSettings.orgId, orgId));
      if (orgSmtpSettings.length > 0) {
          info(`Migrating SMTP settings...`);
          await tenantDb.insert(smtpSettings).values(orgSmtpSettings);
      }

      const orgEmailTemplates = await db.select().from(emailTemplates).where(inArray(emailTemplates.projectId, projectIds));
      if (orgEmailTemplates.length > 0) {
          info(`Migrating ${orgEmailTemplates.length} email templates...`);
          await tenantDb.insert(emailTemplates).values(orgEmailTemplates);
      }
    }

    // 5. Update Organization with dbName in Root DB
    await db.update(organizations).set({ dbName }).where(eq(organizations.id, orgId));
    info(`SUCCESS! Organization ${org.name} migrated to ${dbName}.`);

  } catch (err: any) {
    error(`Migration FAILED for org ${orgId}: ${err.message}`);
    throw err;
  }
}

// Run for Infra-Ventry (ID 2)
migrateOrg(2).then(() => {
  info("Migration process finished.");
  process.exit(0);
}).catch((err) => {
  error("Fatal error during migration:", err);
  process.exit(1);
});
