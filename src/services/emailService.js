/**
 * emailService.js — Nodemailer transactional emails (OTP, booking, SOS alerts)
 */
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

function createTransport() {
  if (process.env.EMAIL_MOCK === 'true') {
    return nodemailer.createTransport({ jsonTransport: true });
  }
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASS || '',
    },
  });
}

const FROM = process.env.EMAIL_FROM || 'PowerRoute <noreply@powerroute.app>';

function generateOtp() {
  return String(Math.floor(100000 + crypto.randomInt(900000)));
}
async function hashOtp(otp) { return bcrypt.hash(otp, 10); }
async function verifyOtp(plain, hashed) { return bcrypt.compare(plain, hashed); }

function baseTemplate(title, content) {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0a1628;border-radius:16px;color:#f8fafc;">
      <div style="text-align:center;margin-bottom:24px;">
        <span style="font-size:32px;">⚡</span>
        <h1 style="margin:8px 0 4px;font-size:22px;font-weight:700;color:#4ADE80;">PowerRoute</h1>
        <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:3px;">${title}</p>
      </div>
      ${content}
      <p style="color:#475569;font-size:11px;text-align:center;margin-top:24px;">© 2024 PowerRoute · EV Charging Platform</p>
    </div>`;
}

async function sendOtpEmail(toEmail, otp) {
  if (process.env.EMAIL_MOCK === 'true') {
    console.log(JSON.stringify({ ts: new Date().toISOString(), event: 'OTP_MOCK', to: toEmail, otp }));
    return { mock: true, otp };
  }
  const transport = createTransport();
  return transport.sendMail({
    from: FROM, to: toEmail,
    subject: 'PowerRoute — Your verification code',
    text: `Your PowerRoute verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, please ignore this email.`,
    html: baseTemplate('Email Verification', `
      <p style="color:#94a3b8;font-size:14px;">Enter this code to verify your email:</p>
      <div style="text-align:center;margin:24px 0;">
        <span style="display:inline-block;padding:16px 32px;background:rgba(74,222,128,0.12);border:1px solid rgba(74,222,128,0.35);border-radius:12px;font-size:36px;font-weight:800;letter-spacing:8px;color:#4ADE80;">${otp}</span>
      </div>
      <p style="color:#64748b;font-size:12px;text-align:center;">Expires in <strong>10 minutes</strong>. Do not share.</p>
    `),
  });
}

async function sendPasswordResetEmail(toEmail, otp) {
  if (process.env.EMAIL_MOCK === 'true') {
    console.log(JSON.stringify({ ts: new Date().toISOString(), event: 'RESET_OTP_MOCK', to: toEmail, otp }));
    return { mock: true, otp };
  }
  const transport = createTransport();
  return transport.sendMail({
    from: FROM, to: toEmail,
    subject: 'PowerRoute — Password Reset Code',
    text: `Your PowerRoute password reset code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, please ignore this email.`,
    html: baseTemplate('Password Reset', `
      <p style="color:#94a3b8;font-size:14px;">Use this code to reset your password:</p>
      <div style="text-align:center;margin:24px 0;">
        <span style="display:inline-block;padding:16px 32px;background:rgba(56,189,248,0.12);border:1px solid rgba(56,189,248,0.35);border-radius:12px;font-size:36px;font-weight:800;letter-spacing:8px;color:#38BDF8;">${otp}</span>
      </div>
      <p style="color:#64748b;font-size:12px;text-align:center;">Expires in <strong>10 minutes</strong>. If you didn't request this, ignore this email.</p>
    `),
  });
}

async function sendBookingConfirmationEmail(toEmail, bookingDetails) {
  if (process.env.EMAIL_MOCK === 'true') {
    console.log(JSON.stringify({ ts: new Date().toISOString(), event: 'BOOKING_CONFIRM_MOCK', to: toEmail, bookingDetails }));
    return { mock: true };
  }
  const transport = createTransport();
  return transport.sendMail({
    from: FROM, to: toEmail,
    subject: `PowerRoute — Booking Confirmed #${bookingDetails.id}`,
    text: `Your charging slot is booked!\nStation: ${bookingDetails.stationName}\nScheduled: ${bookingDetails.scheduledAt}\nDuration: ${bookingDetails.durationMinutes} minutes\nEstimated Cost: ₹${bookingDetails.estimatedCostINR}`,
    html: baseTemplate('Booking Confirmed', `
      <p style="color:#94a3b8;font-size:14px;text-align:center;">Your charging slot is booked!</p>
      <div style="background:rgba(74,222,128,0.08);border:1px solid rgba(74,222,128,0.2);border-radius:12px;padding:20px;margin:16px 0;">
        <p style="margin:6px 0;color:#e2e8f0;font-size:14px;">📍 <strong>Station:</strong> ${bookingDetails.stationName}</p>
        <p style="margin:6px 0;color:#e2e8f0;font-size:14px;">🕒 <strong>Scheduled:</strong> ${bookingDetails.scheduledAt}</p>
        <p style="margin:6px 0;color:#e2e8f0;font-size:14px;">⏱ <strong>Duration:</strong> ${bookingDetails.durationMinutes} minutes</p>
        <p style="margin:6px 0;color:#4ADE80;font-size:14px;font-weight:700;">💰 Estimated: ₹${bookingDetails.estimatedCostINR}</p>
      </div>
    `),
  });
}

async function sendSOSAlertEmail(toEmail, sosDetails) {
  if (process.env.EMAIL_MOCK === 'true') {
    console.log(JSON.stringify({ ts: new Date().toISOString(), event: 'SOS_ALERT_MOCK', to: toEmail, sosDetails }));
    return { mock: true };
  }
  const transport = createTransport();
  return transport.sendMail({
    from: FROM, to: toEmail,
    subject: `🚨 URGENT: ${sosDetails.userName} needs help!`,
    text: `EMERGENCY ALERT\n${sosDetails.userName} has triggered an SOS!\nLocation: ${sosDetails.address || 'See coordinates'}\nBattery: ${sosDetails.batteryPercent}%\nType: ${sosDetails.type}\n\nPlease check on them immediately or call emergency services.`,
    html: baseTemplate('🚨 SOS ALERT', `
      <div style="background:rgba(239,68,68,0.15);border:2px solid rgba(239,68,68,0.5);border-radius:12px;padding:20px;margin:16px 0;">
        <p style="color:#fca5a5;font-size:16px;font-weight:700;text-align:center;">EMERGENCY ALERT</p>
        <p style="margin:6px 0;color:#e2e8f0;font-size:14px;">👤 <strong>${sosDetails.userName}</strong> has triggered an SOS!</p>
        <p style="margin:6px 0;color:#e2e8f0;font-size:14px;">📍 <strong>Location:</strong> ${sosDetails.address || 'See coordinates'}</p>
        <p style="margin:6px 0;color:#e2e8f0;font-size:14px;">🔋 <strong>Battery:</strong> ${sosDetails.batteryPercent}%</p>
        <p style="margin:6px 0;color:#e2e8f0;font-size:14px;">⚠️ <strong>Type:</strong> ${sosDetails.type}</p>
      </div>
      <p style="color:#94a3b8;font-size:12px;text-align:center;">Please check on them immediately or call emergency services.</p>
    `),
  });
}

module.exports = { generateOtp, hashOtp, verifyOtp, sendOtpEmail, sendPasswordResetEmail, sendBookingConfirmationEmail, sendSOSAlertEmail };
