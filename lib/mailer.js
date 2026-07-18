import nodemailer from "nodemailer";

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}
export async function sendWarrantyEmail({ to, cc, bcc, subject, body, attachments }) {
  const transporter = getTransporter();
  const htmlBody = (body || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
  await transporter.sendMail({
    from: `"A Plus Digital Solutions" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    ...(cc ? { cc } : {}),
    ...(bcc ? { bcc } : {}),
    subject,
    text: body || "",
    html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1e293b;line-height:1.8">${htmlBody}</div>`,
    attachments: Array.isArray(attachments) ? attachments : [],
  });
}
