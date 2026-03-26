import { log as info, error } from "./logger";
import nodemailer from "nodemailer";
import type { SmtpSettings } from "@shared/schema";

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  private static async getTransporter(settings: SmtpSettings) {
    // We don't cache the transporter globally anymore because settings can vary per project.
    // Nodemailer handles connection pooling internally if needed.
    return nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.port === 465,
      auth: {
        user: settings.user,
        pass: settings.pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  // Clear transporter when settings are updated
  static clearTransporter() {
    this.transporter = null;
  }

  static async sendAlertEmail(
    recipient: string,
    resourceName: string,
    projectName: string,
    type: string,
    value: number,
    threshold: number,
    settings: SmtpSettings & { senderName?: string },
    branding?: { companyName?: string | null; logoUrl?: string | null },
    template?: { subject: string, body: string },
    isRecovery: boolean = false
  ) {
    const transporter = await this.getTransporter(settings);

    const companyName = branding?.companyName || "Infrastructure Monitor";
    const logoUrl = branding?.logoUrl;

    const safeType = (type || "alert").toString();
    const displayType = safeType.toUpperCase();

    const logoImg = logoUrl ? `<img src="${logoUrl}" alt="${companyName}" style="max-height: 40px; width: auto; vertical-align: middle;">` : "";

    // Parse Simple Config if available for advanced settings
    let simpleConfig: any = null;
    if (template?.body) {
      const configMatch = template.body.match(/<!-- SIMPLE_CONFIG: (.*) -->/);
      if (configMatch) {
         try {
           simpleConfig = JSON.parse(configMatch[1]);
         } catch (e) {}
      }
    }

    let defaultSubject = isRecovery 
      ? `Recovery: ${displayType} stabilized on ${resourceName}`
      : `Alert: High ${displayType} usage on ${resourceName}`;

    // Use mode-specific subject from simple config if available, otherwise fallback to column subject
    let subject = template?.subject || defaultSubject;
    if (simpleConfig) {
      if (isRecovery && simpleConfig.recoverySubject) subject = simpleConfig.recoverySubject;
      else if (!isRecovery && simpleConfig.alertSubject) subject = simpleConfig.alertSubject;
    }
    
    // Final check: if it's a recovery but subject doesn't mention it (and no custom recovery subject), prefix it
    if (isRecovery && !subject.toLowerCase().includes('recovery') && !subject.toLowerCase().includes('fixed') && !subject.toLowerCase().includes('stabilized')) {
      subject = `Recovery: ${subject}`;
    }

    // Simple variable replacement
    subject = subject
      .replace(/{{project}}/g, projectName)
      .replace(/{{resource}}/g, resourceName)
      .replace(/{{type}}/g, displayType)
      .replace(/{{value}}/g, Math.round(value).toString())
      .replace(/{{threshold}}/g, Math.round(threshold).toString())
      .replace(/{{company}}/g, companyName)
      .replace(/{{logo}}/g, logoUrl || "") 
      .replace(/{{company_name}}/g, companyName)
      .replace(/{{logo_url}}/g, logoUrl || "")
      .replace(/{{status}}/g, isRecovery ? "RECOVERY" : "ALERT");

    const getUnit = (t: string) => {
      const typeLower = t.toLowerCase();
      if (typeLower.includes('response')) return 'ms';
      if (typeLower.includes('ssl') || typeLower.includes('expiry') || typeLower.includes('domain')) return ' days';
      if (typeLower.includes('connections')) return '';
      if (typeLower.includes('status')) return '';
      return '%';
    };

    const unit = getUnit(type);

    let defaultBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 40px 20px; border: 1px solid #e2e8f0; border-radius: 16px; background: white;">
        <table style="width: 100%; margin-bottom: 32px; border-collapse: collapse;">
          <tr>
            <td style="text-align: left; vertical-align: middle;">
                ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" style="max-height: 40px; width: auto;">` : ""}
            </td>
            <td style="text-align: right; vertical-align: middle; color: #0f172a; font-size: 18px; font-weight: 800; letter-spacing: -0.02em;">
                ${companyName}
            </td>
          </tr>
        </table>
        
        <div style="background: ${isRecovery ? '#d4edda' : '#f8d7da'}; color: ${isRecovery ? '#155724' : '#721c24'}; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <strong>${isRecovery ? 'Recovery' : 'Critical Alert!'}</strong> ${isRecovery ? `${displayType} is now stable on ${resourceName}.` : `High ${displayType} usage detected on ${projectName}.`}
        </div>

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Project:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${projectName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Resource:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${resourceName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Metric:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${type} Usage</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Current Value:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; color: ${isRecovery ? '#28a745' : '#dc3545'};"><strong>${Math.round(value)}${unit}</strong></td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Threshold:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${Math.round(threshold)}${unit}</td>
          </tr>
        </table>

        <div style="margin-top: 30px; font-size: 12px; color: #777; text-align: center;">
          This is an automated alert from ${companyName}.
        </div>
      </div>
    `;

    let html = template?.body || defaultBody;
    
    // Support dual-mode templates from the frontend
    if (html.includes('<!-- ALERT_START -->')) {
      const section = isRecovery ? 'RECOVERY' : 'ALERT';
      const match = html.match(new RegExp(`<!-- ${section}_START -->([\\s\\S]*?)<!-- ${section}_END -->`));
      if (match) {
        html = match[1];
      }
    }

    html = html
      .replace(/{{project}}/g, projectName)
      .replace(/{{resource}}/g, resourceName)
      .replace(/{{type}}/g, displayType)
      .replace(/{{value}}/g, Math.round(value).toString())
      .replace(/{{threshold}}/g, Math.round(threshold).toString())
      .replace(/{{unit}}/g, unit)
      .replace(/{{company}}/g, companyName)
      .replace(/{{logo}}/g, logoImg)
      .replace(/{{status}}/g, isRecovery ? "RECOVERY" : "ALERT")
      .replace(/{{badge_color}}/g, isRecovery ? "#28a745" : "#dc3545")
      .replace(/{{company_name}}/g, companyName)
      .replace(/{{logo_url}}/g, logoUrl || "");

    const senderName = settings.senderName || companyName;

    await transporter.sendMail({
      from: `"${senderName}" <${settings.fromEmail}>`,
      to: recipient,
      subject,
      html,
    });
  }

  static async sendTestEmail(settings: SmtpSettings & { senderName?: string }, recipient: string) {
    info(`Attempting to send test email to ${recipient} via ${settings.host}:${settings.port}`);

    // We recreate transporter to ensure we use current settings
    const transporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.port === 465,
      auth: {
        user: settings.user,
        pass: settings.pass,
      },
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 5000,
      tls: {
        // Do not fail on invalid certs (common for internal SMTP)
        rejectUnauthorized: false
      }
    });

    try {
      await transporter.verify();
      info("SMTP connection verified successfully");
    } catch (verifyError) {
      error("SMTP Verification failed:", verifyError);
      throw new Error(`SMTP Connection failed: ${verifyError instanceof Error ? verifyError.message : String(verifyError)}`);
    }

    const senderName = (settings as any).senderName || "Infrastructure Monitor";
    await transporter.sendMail({
      from: `"${senderName}" <${settings.fromEmail}>`,
      to: recipient,
      subject: "SMTP Configuration Test",
      text: "If you are receiving this, your SMTP settings are correctly configured.",
      html: `<h3>SMTP Configuration Success</h3><p>Your SMTP settings are working correctly.</p>`,
    });
  }
}
