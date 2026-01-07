import { Resend } from "resend";

// Only initialize Resend if API key is provided (used for waitlist emails, not auth)
const resend = Bun.env.RESEND_API_KEY ? new Resend(Bun.env.RESEND_API_KEY) : null;

const FROM_EMAIL = Bun.env.FROM_EMAIL || "ADAgent <noreply@adagentai.com>";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY not set, skipping email send");
    return { success: false, error: "Email not configured" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text,
    });

    if (error) {
      console.error("[Email] Failed to send:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error("[Email] Error:", err);
    return { success: false, error: String(err) };
  }
}

// Email templates
export function waitlistConfirmationEmail(name?: string) {
  const greeting = name ? `Hi ${name}` : "Hi there";

  return {
    subject: "You're on the ADAgent waitlist!",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #000; font-size: 24px; margin: 0;">ADAgent</h1>
    <p style="color: #666; margin: 5px 0 0;">AI-Powered Ad Management</p>
  </div>

  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 30px; color: white; text-align: center; margin-bottom: 30px;">
    <h2 style="margin: 0 0 10px; font-size: 28px;">You're on the list!</h2>
    <p style="margin: 0; opacity: 0.9;">We'll notify you when it's your turn.</p>
  </div>

  <p>${greeting},</p>

  <p>Thanks for joining the ADAgent waitlist! We're building an AI assistant that makes managing AdMob and Google Ad Manager as easy as having a conversation.</p>

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
    — The ADAgent Team
  </p>
</body>
</html>
    `.trim(),
    text: `
${greeting},

Thanks for joining the ADAgent waitlist!

We're building an AI assistant that makes managing AdMob and Google Ad Manager as easy as having a conversation.

What's coming:
- Natural language queries for your ad data
- Instant revenue and performance insights
- AI-powered optimization suggestions
- Works with AdMob & Google Ad Manager

We're rolling out access in waves. When it's your turn, you'll get an email with instructions to get started.

Questions? Reply to this email - we read everything.

— The ADAgent Team
    `.trim(),
  };
}

export function waitlistInviteEmail(name?: string) {
  const greeting = name ? `Hi ${name}` : "Hi there";
  const appUrl = Bun.env.FRONTEND_URL || "https://adagentai.com";

  return {
    subject: "You're in! Your ADAgent access is ready",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #000; font-size: 24px; margin: 0;">ADAgent</h1>
    <p style="color: #666; margin: 5px 0 0;">AI-Powered Ad Management</p>
  </div>

  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px; padding: 30px; color: white; text-align: center; margin-bottom: 30px;">
    <h2 style="margin: 0 0 10px; font-size: 28px;">You're in!</h2>
    <p style="margin: 0; opacity: 0.9;">Your access to ADAgent is ready.</p>
  </div>

  <p>${greeting},</p>

  <p>Great news! Your spot on the ADAgent waitlist has come up. You can now sign up and start using ADAgent to manage your AdMob and Google Ad Manager accounts.</p>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${appUrl}/login" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Get Started</a>
  </div>

  <p><strong>Quick start:</strong></p>
  <ol style="padding-left: 20px;">
    <li>Click the button above to sign up with Google</li>
    <li>Connect your AdMob or Ad Manager account</li>
    <li>Start asking questions about your ad performance!</li>
  </ol>

  <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
    Need help? Reply to this email and we'll get you sorted.<br><br>
    — The ADAgent Team
  </p>
</body>
</html>
    `.trim(),
    text: `
${greeting},

Great news! Your spot on the ADAgent waitlist has come up.

You can now sign up and start using ADAgent to manage your AdMob and Google Ad Manager accounts.

Get started: ${appUrl}/login

Quick start:
1. Sign up with Google
2. Connect your AdMob or Ad Manager account
3. Start asking questions about your ad performance!

Need help? Reply to this email and we'll get you sorted.

— The ADAgent Team
    `.trim(),
  };
}
