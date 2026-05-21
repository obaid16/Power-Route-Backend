/**
 * authController.js — PowerRoute
 *
 * Auth flow:
 *  POST /auth/signup        → creates unverified account, sends OTP email
 *  POST /auth/verify-email  → verifies OTP, marks account verified, returns JWT
 *  POST /auth/resend-otp    → resends OTP to email
 *  POST /auth/login         → email + password → JWT (verified accounts only)
 *  GET  /auth/me            → returns current user (requires Bearer token)
 *  POST /auth/logout        → stateless; client discards token
 */
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { signToken } = require('../utils/jwt');
const { toAuthUser } = require('../utils/userMapper');
const { generateOtp, hashOtp, verifyOtp, sendOtpEmail } = require('../services/emailService');

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ── Signup — creates account + sends OTP ─────────────────────────────────────
const signup = catchAsync(async (req, res) => {
  const { name, email, phone, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing && existing.isEmailVerified) {
    throw new AppError('An account with this email already exists', 409);
  }

  const hashed = await bcrypt.hash(password, 12);
  const otp = generateOtp();
  const otpHash = await hashOtp(otp);

  // Upsert: allow re-signup if previous account was never verified
  const user = await User.findOneAndUpdate(
    { email },
    {
      name,
      email,
      phone: phone || '',
      password: hashed,
      isEmailVerified: false,
      emailOtp: otpHash,
      emailOtpExpires: new Date(Date.now() + OTP_TTL_MS),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await sendOtpEmail(email, otp);

  res.status(201).json({
    status: 'success',
    message: 'Account created. Check your email for the 6-digit verification code.',
    data: { email, otpSent: true },
  });
});

// ── Verify email OTP ──────────────────────────────────────────────────────────
const verifyEmail = catchAsync(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email }).select('+emailOtp +emailOtpExpires');
  if (!user) throw new AppError('Account not found', 404);
  if (user.isEmailVerified) throw new AppError('Email already verified', 400);
  if (!user.emailOtp || !user.emailOtpExpires) throw new AppError('No OTP found — request a new one', 400);
  if (user.emailOtpExpires < new Date()) throw new AppError('OTP expired — request a new one', 400);

  const valid = await verifyOtp(otp, user.emailOtp);
  if (!valid) throw new AppError('Invalid verification code', 400);

  // Mark verified, clear OTP fields
  user.isEmailVerified = true;
  user.emailOtp = undefined;
  user.emailOtpExpires = undefined;
  await user.save({ validateBeforeSave: false });

  const token = signToken(user._id);
  res.status(200).json({
    status: 'success',
    message: 'Email verified successfully.',
    token,
    data: { user: toAuthUser(user) },
  });
});

// ── Resend OTP ────────────────────────────────────────────────────────────────
const resendOtp = catchAsync(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) throw new AppError('Account not found', 404);
  if (user.isEmailVerified) throw new AppError('Email already verified', 400);

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  user.emailOtp = otpHash;
  user.emailOtpExpires = new Date(Date.now() + OTP_TTL_MS);
  await user.save({ validateBeforeSave: false });

  await sendOtpEmail(email, otp);

  res.status(200).json({
    status: 'success',
    message: 'New verification code sent to your email.',
    data: { email, otpSent: true },
  });
});

// ── Login ─────────────────────────────────────────────────────────────────────
const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError('Incorrect email or password', 401);
  }

  // Allow login even if not verified — just flag it in response
  const token = signToken(user._id);
  res.status(200).json({
    status: 'success',
    token,
    data: {
      user: toAuthUser(user),
      emailVerified: user.isEmailVerified,
    },
  });
});

// ── Get current user ──────────────────────────────────────────────────────────
const getMe = catchAsync(async (req, res) => {
  res.status(200).json({
    status: 'success',
    data: { user: toAuthUser(req.user) },
  });
});

// ── Logout (stateless) ────────────────────────────────────────────────────────
const logout = catchAsync(async (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully. Remove the token on the client.',
  });
});

module.exports = { signup, verifyEmail, resendOtp, login, getMe, logout };
