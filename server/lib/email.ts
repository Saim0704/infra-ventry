import nodemailer from "nodemailer";
import type { SmtpSettings } from "@shared/schema";

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  private static async getTransporter(settings: SmtpSettings) {
    if (this.transporter) {
      // Check if settings changed (simple check)
      // For simplicity, we recreate if not existing. In a real app we might want to cache or pool.
      return this.transporter;
    }

    this.transporter = nodemailer.createTransport({
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

    return this.transporter;
  }

  // Clear transporter when settings are updated
  static clearTransporter() {
    this.transporter = null;
  }

  static async sendAlertEmail(
    recipient: string,
    serverName: string,
    type: string,
    value: number,
    threshold: number,
    settings: SmtpSettings,
    branding?: { companyName?: string | null; logoUrl?: string | null }
  ) {
    const transporter = await this.getTransporter(settings);

    const companyName = branding?.companyName || "Infrastructure Monitor";
    const logoUrl = branding?.logoUrl;

    const subject = `Alert: High ${type.toUpperCase()} usage on ${serverName}`;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" style="max-height: 50px;">` : ""}
          <h2 style="color: #333;">${companyName}</h2>
        </div>
        
        <div style="background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <strong>Critical Alert!</strong> High ${type} usage detected.
        </div>

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Server:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${serverName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Metric:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${type} Usage</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Current Value:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; color: #dc3545;"><strong>${value.toFixed(2)}%</strong></td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Threshold:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${threshold}%</td>
          </tr>
        </table>

        <div style="margin-top: 30px; font-size: 12px; color: #777; text-align: center;">
          This is an automated alert from ${companyName}.
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"${companyName}" <${settings.fromEmail}>`,
      to: recipient,
      subject,
      html,
    });
  }

  static async sendTestEmail(settings: SmtpSettings, recipient: string) {
    console.log(`Attempting to send test email to ${recipient} via ${settings.host}:${settings.port}`);

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
      console.log("SMTP connection verified successfully");
    } catch (verifyError) {
      console.error("SMTP Verification failed:", verifyError);
      throw new Error(`SMTP Connection failed: ${verifyError instanceof Error ? verifyError.message : String(verifyError)}`);
    }

    await transporter.sendMail({
      from: `"Infrastructure Monitor" <${settings.fromEmail}>`,
      to: recipient,
      subject: "SMTP Configuration Test",
      text: "If you are receiving this, your SMTP settings are correctly configured.",
      html: `<h3>SMTP Configuration Success</h3><p>Your SMTP settings are working correctly.</p>`,
    });
  }
}
