/**
 * Quick SMTP test script
 * Run: cd backend && bun api/scripts/test-smtp.ts
 */

import nodemailer from "nodemailer";

console.log("=== SMTP Configuration Test ===\n");

// Check env vars
const config = {
  host: Bun.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(Bun.env.SMTP_PORT || "465"),
  user: Bun.env.SMTP_USER,
  pass: Bun.env.SMTP_PASS,
  fromEmail: Bun.env.SMTP_FROM_EMAIL || Bun.env.SMTP_USER,
  fromName: Bun.env.SMTP_FROM_NAME || "ADAgentAI",
};

console.log("Host:", config.host);
console.log("Port:", config.port);
console.log("User:", config.user || "❌ NOT SET");
console.log("Pass:", config.pass ? `✅ Set (${config.pass.length} chars)` : "❌ NOT SET");
console.log("From:", `${config.fromName} <${config.fromEmail}>`);
console.log("");

if (!config.user || !config.pass) {
  console.error("❌ SMTP_USER or SMTP_PASS not set. Check your .env file.");
  process.exit(1);
}

// Create transporter
console.log("Creating transporter...");
const transporter = nodemailer.createTransport({
  host: config.host,
  port: config.port,
  secure: config.port === 465,
  auth: {
    user: config.user,
    pass: config.pass,
  },
});

// Verify connection
console.log("Verifying SMTP connection...\n");

try {
  await transporter.verify();
  console.log("✅ SMTP connection successful!\n");
} catch (error) {
  console.error("❌ SMTP connection failed:");
  console.error(error);
  process.exit(1);
}

// Optional: Send test email
const testEmail = process.argv[2];
if (testEmail) {
  console.log(`Sending test email to: ${testEmail}`);
  try {
    const info = await transporter.sendMail({
      from: `${config.fromName} <${config.fromEmail}>`,
      to: testEmail,
      subject: "SMTP Test - ADAgentAI",
      text: "If you received this, SMTP is working!",
      html: "<h1>SMTP Test</h1><p>If you received this, SMTP is working! 🎉</p>",
    });
    console.log("✅ Email sent! Message ID:", info.messageId);
  } catch (error) {
    console.error("❌ Failed to send email:");
    console.error(error);
  }
} else {
  console.log("To send a test email, run:");
  console.log("  cd backend && bun api/scripts/test-smtp.ts your-email@example.com");
}
