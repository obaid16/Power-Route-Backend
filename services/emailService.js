/**
 * emailService.js — PowerRoute
 *
 * Sends transactional emails via nodemailer.
 * Configure SMTP credentials in .env:
 *   EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM
 *
 * For local dev without real SMTP, set EMAIL_MOCK=true to log OTPs to console.
 */
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// ── Transport ─────────────────────────────────────────────────────────────────
function createTransport() {
  if (process.env.EMAIL_MOCK === 'true') {
    // Mock transport — logs to console, no real email sent
    return nodemailer.createTransport({
      jsonTransport: true,
    });
  }
  return nodemailer.createTransport({
    host:   process.env.EMAIL_HOST   || 'smtp.gmail.com',
    port:   Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASS || '',
    },
  });
}

// ── Generate a 6-digit OTP ────────────────────────────────────────────────────
function generateOtp() {
  return String(Math.floor(100000 + crypto.randomInt(900000)));
}

// ── Hash OTP for storage ──────────────────────────────────────────────────────
async function hashOtp(otp) {
  return bcrypt.hash(otp, 10);
}

// ── Verify OTP against hash ───────────────────────────────────────────────────
async function verifyOtp(plain, hashed) {
  return bcrypt.compare(plain, hashed);
}

// ── Send OTP email ────────────────────────────────────────────────────────────
async function sendOtpEmail(toEmail, otp) {
  // In mock mode — skip the SMTP transport entirely and just log to console.
  // This prevents the nodemailer jsonTransport from hanging the signup flow.
  if (process.env.EMAIL_MOCK === 'true') {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ ts: new Date().toISOString(), event: 'OTP_MOCK', to: toEmail, otp }));
    return { mock: true, otp };
  }

  const from = process.env.EMAIL_FROM || 'PowerRoute <noreply@powerroute.app>';
  const transport = createTransport();

  const info = await transport.sendMail({
    from,
    to: toEmail,
    subject: 'PowerRoute — Your verification code',
    text: `Your PowerRoute verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, please ignore this email.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0a1628;border-radius:16px;color:#f8fafc;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:16px;background:rgba(0,212,255,0.15);border:1px solid rgba(0,212,255,0.3);">
            <span style="font-size:28px;">⚡</span>
          </div>
          <h1 style="margin:12px 0 4px;font-size:22px;font-weight:700;color:#f8fafc;">PowerRoute</h1>
          <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:3px;">Email Verification</p>
        </div>
        <p style="color:#94a3b8;font-size:14px;line-height:1.6;">Enter this code to verify your email address:</p>
        <div style="text-align:center;margin:24px 0;">
          <span style="display:inline-block;padding:16px 32px;background:rgba(0,212,255,0.12);border:1px solid rgba(0,212,255,0.35);border-radius:12px;font-size:36px;font-weight:800;letter-spacing:8px;color:#00d4ff;">${otp}</span>
        </div>
        <p style="color:#64748b;font-size:12px;text-align:center;">Expires in <strong style="color:#94a3b8;">10 minutes</strong>. Do not share this code.</p>
      </div>
    `,
  });

  return info;
}

module.exports = { generateOtp, hashOtp, verifyOtp, sendOtpEmail };

