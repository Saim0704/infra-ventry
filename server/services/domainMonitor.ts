import { whoisDomain } from "whoiser";
import { storage } from "../storage";
import { EmailService } from "../lib/email";
import { db } from "../db";
import { domainMonitors } from "@shared/schema";
import { eq, or, isNull, lt } from "drizzle-orm";

export class DomainMonitorService {
    private static interval: NodeJS.Timeout | null = null;
    // Run checks roughly once every day
    private static readonly CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
    // Pre-check window: if a domain needs checking within 12 hours, check it now
    private static readonly PRECHECK_WINDOW_MS = 12 * 60 * 60 * 1000;

    static start() {
        if (this.interval) return;

        // Initial check after a short wait
        setTimeout(() => {
            this.checkDomains().catch((err) => {
                console.error("Initial Domain Monitor Check Error:", err);
            });
        }, 10000);

        // Periodic check
        this.interval = setInterval(async () => {
            try {
                await this.checkDomains();
            } catch (err) {
                console.error("Domain Monitor Loop Error:", err);
            }
        }, this.CHECK_INTERVAL_MS);

        console.log("[DomainMonitor] Service started");
    }

    static stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            console.log("[DomainMonitor] Service stopped");
        }
    }

    private static async checkDomains() {
        try {
            // Find monitors that need checking (nextCheck is null or in the past/near future)
            const now = new Date();
            const checkThreshold = new Date(now.getTime() + this.PRECHECK_WINDOW_MS);

            const domainsToCheck = await db
                .select()
                .from(domainMonitors)
                .where(
                    or(
                        isNull(domainMonitors.nextCheck),
                        lt(domainMonitors.nextCheck, checkThreshold)
                    )
                );

            if (domainsToCheck.length === 0) return;

            console.log(`[DomainMonitor] Checking ${domainsToCheck.length} domains...`);

            for (const monitor of domainsToCheck) {
                await this.checkSingleDomain(monitor);
            }
        } catch (err) {
            console.error("[DomainMonitor] Failed to fetch domains to check:", err);
        }
    }

    static async checkSingleDomain(monitor: any) {
        try {
            console.log(`[DomainMonitor] Checking WHOIS for ${monitor.domain}`);
            const domainWhois = await whoisDomain(monitor.domain, { follow: 1 });

            let expiryDate: Date | null = null;

            // whoiser returns an object with registrar keys or domain name keys
            const firstKey = Object.keys(domainWhois)[0];
            if (firstKey && domainWhois[firstKey]) {
                const whoisData = domainWhois[firstKey];
                if (whoisData["Expiry Date"]) {
                    expiryDate = new Date(whoisData["Expiry Date"] as string);
                } else if (whoisData["Registrar Registration Expiration Date"]) {
                    expiryDate = new Date(whoisData["Registrar Registration Expiration Date"] as string);
                } else if (whoisData["Registry Expiry Date"]) {
                    expiryDate = new Date(whoisData["Registry Expiry Date"] as string);
                }
            }

            const now = new Date();
            // Next check in 7 days roughly, unless expiring sooner
            let nextCheck = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

            await storage.updateDomainMonitor(monitor.id, {
                expiryDate: expiryDate,
                lastCheck: now,
                nextCheck: nextCheck,
            });

            if (expiryDate) {
                const daysToExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                console.log(`[DomainMonitor] ${monitor.domain} expires in ${daysToExpiry} days (${expiryDate.toISOString()})`);

                // Alert check handled in triggerExpiryAlert
                const lastAlert = monitor.lastAlertSentAt ? new Date(monitor.lastAlertSentAt) : null;
                const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

                if (!lastAlert || lastAlert < sevenDaysAgo) {
                    await this.triggerExpiryAlert(monitor, daysToExpiry, expiryDate);
                }
            }
        } catch (err) {
            console.error(`[DomainMonitor] Error checking ${monitor.domain}:`, err);
        }
    }

    private static async triggerExpiryAlert(monitor: any, daysToExpiry: number, expiryDate: Date) {
        try {
            if (!monitor.projectId) return;

            // Trigger centralized alert check
            await storage.checkAndTriggerAlert(monitor.id, 'domain', [
                { type: 'domain_expiry', value: daysToExpiry, operator: '<=' },
            ]);

            // Update last alert sent
            await storage.updateDomainMonitor(monitor.id, {
                lastAlertSentAt: new Date()
            });

            console.log(`[DomainMonitor] Centralized alert check triggered for expiring domain ${monitor.domain}`);
        } catch (err) {
            console.error(`[DomainMonitor] Failed to trigger centralized alert for ${monitor.domain}:`, err);
        }
    }
}
