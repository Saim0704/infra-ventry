import { whoisDomain } from "whoiser";
import { storage } from "../storage";
import { EmailService } from "../lib/email";
import { db } from "../db";
import { domainMonitors } from "@shared/schema";
import { eq, or, isNull, lt } from "drizzle-orm";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

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

    private static async runWithTimeout<T>(promise: Promise<T>, ms: number = 10000): Promise<T> {
        let timer: NodeJS.Timeout;
        const timeoutPromise = new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error('timeout')), ms);
        });
        return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
    }

    static async checkSingleDomain(monitor: any) {
        let expiryDate: Date | null = null;
        try {
            console.log(`[DomainMonitor] Checking WHOIS via whoiser for ${monitor.domain}`);
            
            if (!monitor.domain.endsWith('.in') && !monitor.domain.endsWith('.co.in')) {
                const domainWhois = await this.runWithTimeout(whoisDomain(monitor.domain, { follow: 1 }), 15000);

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
            }
        } catch (err) {
            console.error(`[DomainMonitor] whoiser failed for ${monitor.domain}:`, err instanceof Error ? err.message : err);
        }

        if (!expiryDate) {
            console.log(`[DomainMonitor] Falling back to native whois for ${monitor.domain}`);
            try {
                const isDotIn = monitor.domain.endsWith('.in') || monitor.domain.endsWith('.co.in');
                const cmd = isDotIn ? `whois -h whois.nixiregistry.in ${monitor.domain}` : `whois ${monitor.domain}`;
                
                const { stdout } = await this.runWithTimeout(execAsync(cmd), 15000);
                
                let matches = stdout.match(/Registry Expiry Date:\s*([^\n\r]+)/i);
                if (matches) expiryDate = new Date(matches[1].trim());
                
                if (!expiryDate) {
                    matches = stdout.match(/Registrar Registration Expiration Date:\s*([^\n\r]+)/i);
                    if (matches) expiryDate = new Date(matches[1].trim());
                }
                
                if (!expiryDate) {
                    matches = stdout.match(/Expiry Date:\s*([^\n\r]+)/i);
                    if (matches) expiryDate = new Date(matches[1].trim());
                }
            } catch (fallbackErr) {
                console.error(`[DomainMonitor] Native whois fallback failed for ${monitor.domain}:`, fallbackErr instanceof Error ? fallbackErr.message : fallbackErr);
            }
        }

        try {
            const now = new Date();
            // Next check in 7 days roughly if successful, else in 12 hours for failures
            let nextCheckMs = expiryDate ? 7 * 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000;
            let nextCheck = new Date(now.getTime() + nextCheckMs);

            await storage.updateDomainMonitor(monitor.id, {
                expiryDate: expiryDate || monitor.expiryDate,
                lastCheck: now,
                nextCheck: nextCheck,
            });

            if (expiryDate) {
                const daysToExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                console.log(`[DomainMonitor] ${monitor.domain} expires in ${daysToExpiry} days (${expiryDate.toISOString()})`);

                const lastAlert = monitor.lastAlertSentAt ? new Date(monitor.lastAlertSentAt) : null;
                const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

                if (!lastAlert || lastAlert < sevenDaysAgo) {
                    await this.triggerExpiryAlert(monitor, daysToExpiry, expiryDate);
                }
            }
        } catch (dbErr) {
            console.error(`[DomainMonitor] DB Error updating monitor for ${monitor.domain}:`, dbErr);
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
