import nodemailer from "nodemailer";

// Gmail SMTP configuration (same credentials as Neon Auth)
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "465");
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL || SMTP_USER;
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || "ADAgentAI";

// Check if SMTP is configured
const isSmtpConfigured = !!(SMTP_USER && SMTP_PASS);

// Create transporter only if configured
const transporter = isSmtpConfigured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // true for 465, false for other ports
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  : null;

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  if (!transporter || !isSmtpConfigured) {
    console.warn("[Email] SMTP not configured (set SMTP_USER and SMTP_PASS), skipping email send");
    return { success: false, error: "Email not configured" };
  }

  try {
    const info = await transporter.sendMail({
      from: `${SMTP_FROM_NAME} <${SMTP_FROM_EMAIL}>`,
      to,
      subject,
      html,
      text,
    });

    console.log("[Email] Sent successfully:", info.messageId);
    return { success: true, data: { messageId: info.messageId } };
  } catch (err) {
    console.error("[Email] Error:", err);
    return { success: false, error: String(err) };
  }
}

// Email templates
export function waitlistConfirmationEmail(name?: string) {
  const greeting = name ? `Hi ${name}` : "Hi there";

  return {
    subject: "You're on the ADAgentAI waitlist!",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" style="width: 48px; height: 48px; margin-bottom: 12px;">
      <path d="M 115.492 143.256 L 167.046 143.256 L 256.938 368.744 L 207.641 368.744 L 188.758 321.377 L 93.780 321.377 L 74.897 368.744 L 25.600 368.744 Z M 141.269 200.249 L 110.462 279.530 L 172.075 279.530 Z" fill="#000000" fill-rule="evenodd" />
      <path d="M 214.815 143.256 L 264.112 143.256 L 354.003 368.744 L 304.706 368.744 Z" fill="#000000" />
      <path d="M 283.764 143.256 L 373.656 143.256 A 112.744 112.744 0 0 1 373.656 368.744 L 373.656 368.744 L 354.003 319.448 L 373.656 319.448 A 63.448 63.448 0 0 0 373.656 192.552 L 303.416 192.552 Z" fill="#000000" />
    </svg>
    <h1 style="color: #000; font-size: 24px; margin: 0;">ADAgentAI</h1>
    <p style="color: #666; margin: 5px 0 0;">AI-Powered Ad Management</p>
  </div>

  <div style="background: #000; border-radius: 12px; padding: 30px; color: white; text-align: center; margin-bottom: 30px;">
    <h2 style="margin: 0 0 10px; font-size: 28px;">You're on the list!</h2>
    <p style="margin: 0; opacity: 0.9;">We'll notify you when it's your turn.</p>
  </div>

  <p>${greeting},</p>

  <p>Thanks for joining the ADAgentAI waitlist! We're building an AI assistant that makes managing AdMob and Google Ad Manager as easy as having a conversation.</p>

  <p><strong>What's coming:</strong></p>
  <ul style="padding-left: 20px;">
    <li>Natural language queries for your ad data</li>
    <li>Instant revenue and performance insights</li>
    <li>AI-powered optimization suggestions</li>
    <li>Works with AdMob & Google Ad Manager</li>
  </ul>

  <p>We're rolling out access in waves. When it's your turn, you'll get an email with instructions to get started.</p>

  <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
    Questions? Reply to this email - we read everything.<br><br>
    — The ADAgentAI Team
  </p>
</body>
</html>
    `.trim(),
    text: `
${greeting},

Thanks for joining the ADAgentAI waitlist!

We're building an AI assistant that makes managing AdMob and Google Ad Manager as easy as having a conversation.

What's coming:
- Natural language queries for your ad data
- Instant revenue and performance insights
- AI-powered optimization suggestions
- Works with AdMob & Google Ad Manager

We're rolling out access in waves. When it's your turn, you'll get an email with instructions to get started.

Questions? Reply to this email - we read everything.

— The ADAgentAI Team
    `.trim(),
  };
}

export function waitlistInviteEmail(name?: string) {
  const greeting = name ? `Hi ${name}` : "Hi there";
  const appUrl = process.env.FRONTEND_URL || "https://adagentai.com";

  return {
    subject: "You're in! Your ADAgentAI access is ready",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" style="width: 48px; height: 48px; margin-bottom: 12px;">
      <path d="M 115.492 143.256 L 167.046 143.256 L 256.938 368.744 L 207.641 368.744 L 188.758 321.377 L 93.780 321.377 L 74.897 368.744 L 25.600 368.744 Z M 141.269 200.249 L 110.462 279.530 L 172.075 279.530 Z" fill="#000000" fill-rule="evenodd" />
      <path d="M 214.815 143.256 L 264.112 143.256 L 354.003 368.744 L 304.706 368.744 Z" fill="#000000" />
      <path d="M 283.764 143.256 L 373.656 143.256 A 112.744 112.744 0 0 1 373.656 368.744 L 373.656 368.744 L 354.003 319.448 L 373.656 319.448 A 63.448 63.448 0 0 0 373.656 192.552 L 303.416 192.552 Z" fill="#000000" />
    </svg>
    <h1 style="color: #000; font-size: 24px; margin: 0;">ADAgentAI</h1>
    <p style="color: #666; margin: 5px 0 0;">AI-Powered Ad Management</p>
  </div>

  <div style="background: #000; border-radius: 12px; padding: 30px; color: white; text-align: center; margin-bottom: 30px;">
    <h2 style="margin: 0 0 10px; font-size: 28px;">You're in!</h2>
    <p style="margin: 0; opacity: 0.9;">Your access to ADAgentAI is ready.</p>
  </div>

  <p>${greeting},</p>

  <p>Great news! Your spot on the ADAgentAI waitlist has come up. You can now sign up and start using ADAgentAI to manage your AdMob and Google Ad Manager accounts.</p>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${appUrl}/login" style="background: #000; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Get Started</a>
  </div>

  <p><strong>Quick start:</strong></p>
  <ol style="padding-left: 20px;">
    <li>Click the button above to sign up with Google</li>
    <li>Connect your AdMob or Ad Manager account</li>
    <li>Start asking questions about your ad performance!</li>
  </ol>

  <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
    Need help? Reply to this email and we'll get you sorted.<br><br>
    — The ADAgentAI Team
  </p>
</body>
</html>
    `.trim(),
    text: `
${greeting},

Great news! Your spot on the ADAgentAI waitlist has come up.

You can now sign up and start using ADAgentAI to manage your AdMob and Google Ad Manager accounts.

Get started: ${appUrl}/login

Quick start:
1. Sign up with Google
2. Connect your AdMob or Ad Manager account
3. Start asking questions about your ad performance!

Need help? Reply to this email and we'll get you sorted.

— The ADAgentAI Team
    `.trim(),
  };
}
