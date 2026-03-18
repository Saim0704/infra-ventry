import { info, error, debug, warn } from "./logger";
import axios from "axios";
import { storage } from "../storage";
import { WebMonitor, WebMonitorMetric } from "@shared/schema";
import tls from "tls";

export class WebMonitorService {
    private static interval: NodeJS.Timeout | null = null;

    static start() {
        if (this.interval) return;

        info("Web Monitor Service started", "monitor");

        // Run checks every minute
        this.interval = setInterval(() => this.runChecks(), 60 * 1000);

        // Run once immediately on start
        this.runChecks();
    }

    static async runChecks() {
        try {
            const allMonitors = await storage.getWebMonitors();
            const now = new Date();

            const dueMonitors = allMonitors.filter(m => {
                if (!m.nextCheck) return true;
                return new Date(m.nextCheck) <= now;
            });

            debug(`Monitors check triggered. Total: ${allMonitors.length}, Due: ${dueMonitors.length}`, "monitor");
            if (dueMonitors.length === 0) return;

            info(`Running checks for ${dueMonitors.length} monitors`, "monitor");

            for (const monitor of dueMonitors) {
                await this.performCheck(monitor);
            }
        } catch (err) {
            error("Error in WebMonitorService.runChecks:", err);
        }
    }

    private static async performCheck(monitor: WebMonitor) {
        const start = Date.now();
        let isUp = false;
        let status = 0;
        let responseTime = 0;
        let serverName: string | null = null;
        let tlsVersion: string | null = null;

        // Ensure URL has a protocol
        const urlStr = monitor.url.trim();
        const urlToCheck = urlStr.includes("://") ? urlStr : `https://${urlStr}`;

        try {
            info(`Checking ${urlToCheck}`, "monitor");
            const response = await axios({
                method: (monitor.method || "GET").toUpperCase() as any,
                url: urlToCheck,
                timeout: monitor.timeout || 10000,
                maxRedirects: monitor.followRedirects ? 5 : 0,
                validateStatus: () => true, // Don't throw for non-2xx
                headers: {
                    "User-Agent": "InfraWatch-Monitor/1.0"
                }
            });

            status = response.status;
            responseTime = Date.now() - start;
            serverName = response.headers['server'] || null;
            debug(`Response headers for ${urlToCheck}:`, response.headers, "monitor");

            const statusMatches = status === (monitor.expectedStatus || 200);
            let contentMatches = true;

            if (monitor.healthCheckString) {
                const body = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
                contentMatches = body.includes(monitor.healthCheckString);
            }

            isUp = statusMatches && contentMatches;
            info(`Check result for ${urlToCheck}: status=${status}, isUp=${isUp}`, "monitor");
        } catch (err: any) {
            responseTime = Date.now() - start;
            warn(`Check failed for ${urlToCheck}: ${err.message}`, "monitor");
        }

        // SSL Check
        let sslStatus: string | null = null;
        let sslExpiryDate: Date | null = null;

        if (urlToCheck.startsWith("https://")) {
            try {
                const sslInfo = await this.checkSSL(urlToCheck);
                sslExpiryDate = sslInfo.expiryDate;
                tlsVersion = sslInfo.protocol || null;

                const daysToExpiry = Math.floor((sslExpiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                if (daysToExpiry <= 0) {
                    sslStatus = 'expired';
                } else if (daysToExpiry <= (monitor.sslExpiryThreshold || 7)) {
                    sslStatus = 'expiring';
                    warn(`SSL certificate for ${urlToCheck} is expiring in ${daysToExpiry} days!`, "monitor");
                } else {
                    sslStatus = 'valid';
                }

                // Trigger SSL expiry alert
                await storage.checkAndTriggerAlert(monitor.id, 'web', [
                    { type: 'web_ssl', value: daysToExpiry, operator: '<=' },
                ]).catch(e => info(`SSL Alert failed for ${urlToCheck}: ${e.message}`, "monitor"));
            } catch (err: any) {
                sslStatus = 'invalid';
                warn(`SSL check failed for ${urlToCheck}: ${err.message}`, "monitor");
            }
        }

        try {
            // Save metrics
            await storage.addWebMonitorMetric({
                monitorId: monitor.id,
                responseTime,
                status,
                isUp
            });

            // Update monitor state
            await storage.updateWebMonitor(monitor.id, {
                lastStatus: isUp ? 'up' : 'down',
                sslStatus: sslStatus as any,
                sslExpiryDate,
                lastCheck: new Date(),
                nextCheck: new Date(Date.now() + 60 * 1000), // Default to 1 min interval for now
                serverName: serverName ?? undefined,
                tlsVersion: tlsVersion ?? undefined,
            });
        } catch (err: any) {
            info(`Storage update failed for ${urlToCheck}: ${err.message}`, "monitor");
        }
    }

    private static checkSSL(urlStr: string): Promise<{ expiryDate: Date, protocol?: string }> {
        return new Promise((resolve, reject) => {
            try {
                const url = new URL(urlStr);
                const port = url.port || 443;

                const socket = tls.connect(Number(port), url.hostname, { servername: url.hostname }, () => {
                    const peerCertificate = socket.getPeerCertificate();
                    const protocol = socket.getProtocol();
                    socket.end();

                    if (!peerCertificate || !peerCertificate.valid_to) {
                        reject(new Error("No certificate found"));
                        return;
                    }

                    resolve({ 
                        expiryDate: new Date(peerCertificate.valid_to),
                        protocol: protocol || undefined 
                    });
                });

                socket.on('error', (err) => {
                    reject(err);
                });

                socket.setTimeout(5000, () => {
                    socket.destroy();
                    reject(new Error("SSL check timeout"));
                });
            } catch (err) {
                reject(err);
            }
        });
    }
}
