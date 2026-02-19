import axios from "axios";
import { storage } from "../storage";
import { WebMonitor, WebMonitorMetric } from "@shared/schema";
import tls from "tls";
import { log } from "../index";

export class WebMonitorService {
    private static interval: NodeJS.Timeout | null = null;

    static start() {
        if (this.interval) return;

        log("Web Monitor Service started", "monitor");

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

            if (dueMonitors.length === 0) return;

            log(`Running checks for ${dueMonitors.length} monitors`, "monitor");

            for (const monitor of dueMonitors) {
                await this.performCheck(monitor);
            }
        } catch (err) {
            console.error("Error in WebMonitorService.runChecks:", err);
        }
    }

    private static async performCheck(monitor: WebMonitor) {
        const start = Date.now();
        let isUp = false;
        let status = 0;
        let responseTime = 0;

        try {
            const response = await axios({
                method: monitor.method || "GET",
                url: monitor.url,
                timeout: monitor.timeout || 10000,
                maxRedirects: monitor.followRedirects ? 5 : 0,
                validateStatus: () => true, // Don't throw for non-2xx
            });

            status = response.status;
            responseTime = Date.now() - start;

            const statusMatches = status === (monitor.expectedStatus || 200);
            let contentMatches = true;

            if (monitor.healthCheckString) {
                const body = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
                contentMatches = body.includes(monitor.healthCheckString);
            }

            isUp = statusMatches && contentMatches;
        } catch (err: any) {
            responseTime = Date.now() - start;
            log(`Check failed for ${monitor.url}: ${err.message}`, "monitor");
        }

        // SSL Check
        let sslStatus: string | null = null;
        let sslExpiryDate: Date | null = null;

        if (monitor.url.startsWith("https://")) {
            try {
                const sslInfo = await this.checkSSL(monitor.url);
                sslExpiryDate = sslInfo.expiryDate;

                const daysToExpiry = Math.floor((sslExpiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                if (daysToExpiry <= 0) {
                    sslStatus = 'expired';
                } else if (daysToExpiry <= (monitor.sslExpiryThreshold || 7)) {
                    sslStatus = 'expiring';
                } else {
                    sslStatus = 'valid';
                }
            } catch (err) {
                sslStatus = 'invalid';
            }
        }

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
        });
    }

    private static checkSSL(urlStr: string): Promise<{ expiryDate: Date }> {
        return new Promise((resolve, reject) => {
            try {
                const url = new URL(urlStr);
                const port = url.port || 443;

                const socket = tls.connect(Number(port), url.hostname, { servername: url.hostname }, () => {
                    const peerCertificate = socket.getPeerCertificate();
                    socket.end();

                    if (!peerCertificate || !peerCertificate.valid_to) {
                        reject(new Error("No certificate found"));
                        return;
                    }

                    resolve({ expiryDate: new Date(peerCertificate.valid_to) });
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
