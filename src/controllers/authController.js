/**
 * authController.js — Full auth flow with refresh tokens and password reset
 *
 * POST /auth/signup          → creates account, sends OTP
 * POST /auth/verify-email    → verifies OTP, returns access + refresh tokens
 * POST /auth/resend-otp      → resends OTP
 * POST /auth/login           → email+password → tokens
 * POST /auth/refresh-token   → rotates refresh token
 * POST /auth/forgot-password → sends reset OTP
 * POST /auth/reset-password  → verifies OTP, resets password
 * GET  /auth/me              → current user
 * POST /auth/logout          → revoke refresh token
 */
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { sendSuccess } = require('../utils/responseHelper');
const { generateOtp, hashOtp, verifyOtp, sendOtpEmail, sendPasswordResetEmail } = require('../services/emailService');

const OTP_TTL_MS = 10 * 60 * 1000;

function buildTokenResponse(user) {
  const accessToken = signAccessToken(user._id, user.role);
  const refreshToken = signRefreshToken(user._id);
  return { accessToken, refreshToken };
}

function setRefreshCookie(res, refreshToken) {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
}

function toPublicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    avatar: user.avatar,
    isEmailVerified: user.isEmailVerified,
    evVehicleModel: user.evVehicleModel,
    batteryCapacityKwh: user.batteryCapacityKwh,
    chargerType: user.chargerType,
    currentBatteryPercent: user.currentBatteryPercent,
    wallet: user.wallet,
  };
}

// ── Signup ────────────────────────────────────────────────────────────────────
const signup = catchAsync(async (req, res) => {
  const { name, email, phone, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing && existing.isEmailVerified) throw new AppError('An account with this email already exists', 409);

  const hashed = await bcrypt.hash(password, 12);
  const otp = generateOtp();
  const otpHash = await hashOtp(otp);

  await User.findOneAndUpdate(
    { email },
    { name, email, phone: phone || '', password: hashed, isEmailVerified: false, emailOtp: otpHash, emailOtpExpires: new Date(Date.now() + OTP_TTL_MS) },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  try {
    await sendOtpEmail(email, otp);
  } catch (err) {
    console.error('SMTP ERROR: Failed to send OTP email to', email, ':', err);
    throw new AppError('Verification email could not be sent. Please check your SMTP configuration.', 500);
  }

  sendSuccess(res, 201, 'Account created. Check your email for verification code.', { email, otpSent: true });
});

// ── Verify Email ──────────────────────────────────────────────────────────────
const verifyEmail = catchAsync(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email }).select('+emailOtp +emailOtpExpires');
  if (!user) throw new AppError('Account not found', 404);
  if (user.isEmailVerified) throw new AppError('Email already verified', 400);
  if (!user.emailOtp || !user.emailOtpExpires) throw new AppError('No OTP found — request a new one', 400);
  if (user.emailOtpExpires < new Date()) throw new AppError('OTP expired — request a new one', 400);
  if (!(await verifyOtp(otp, user.emailOtp))) throw new AppError('Invalid verification code', 400);

  user.isEmailVerified = true;
  user.emailOtp = undefined;
  user.emailOtpExpires = undefined;
  await user.save({ validateBeforeSave: false });

  // Create wallet for new user
  const wallet = await Wallet.create({ user: user._id });
  await User.findByIdAndUpdate(user._id, { wallet: wallet._id });

  const { accessToken, refreshToken } = buildTokenResponse(user);
  setRefreshCookie(res, refreshToken);

  sendSuccess(res, 200, 'Email verified successfully.', { accessToken, refreshToken, user: toPublicUser(user) });
});

// ── Resend OTP ────────────────────────────────────────────────────────────────
const resendOtp = catchAsync(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) throw new AppError('Account not found', 404);
  if (user.isEmailVerified) throw new AppError('Email already verified', 400);

  const otp = generateOtp();
  user.emailOtp = await hashOtp(otp);
  user.emailOtpExpires = new Date(Date.now() + OTP_TTL_MS);
  await user.save({ validateBeforeSave: false });
  try {
    await sendOtpEmail(email, otp);
  } catch (err) {
    console.error('SMTP ERROR: Failed to resend OTP email to', email, ':', err);
    throw new AppError('Verification email could not be sent. Please check your SMTP configuration.', 500);
  }

  sendSuccess(res, 200, 'New verification code sent to your email.', { email, otpSent: true });
});

// ── Login ─────────────────────────────────────────────────────────────────────
const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await bcrypt.compare(password, user.password))) throw new AppError('Incorrect email or password', 401);
  if (!user.isActive) throw new AppError('Account deactivated. Contact support.', 403);

  const { accessToken, refreshToken } = buildTokenResponse(user);
  setRefreshCookie(res, refreshToken);

  sendSuccess(res, 200, 'Logged in successfully.', {
    accessToken,
    refreshToken,
    user: toPublicUser(user),
    emailVerified: user.isEmailVerified,
  });
});

// ── Refresh Token ─────────────────────────────────────────────────────────────
const refreshAccessToken = catchAsync(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!token) throw new AppError('No refresh token provided', 401);

  const decoded = verifyRefreshToken(token);
  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) throw new AppError('User not found or inactive', 401);

  const { accessToken, refreshToken: newRefreshToken } = buildTokenResponse(user);
  setRefreshCookie(res, newRefreshToken);

  sendSuccess(res, 200, 'Token refreshed.', { accessToken, refreshToken: newRefreshToken });
});

// ── Forgot Password ───────────────────────────────────────────────────────────
const forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) throw new AppError('No account with this email', 404);

  const otp = generateOtp();
  user.passwordResetOtp = await hashOtp(otp);
  user.passwordResetExpires = new Date(Date.now() + OTP_TTL_MS);
  await user.save({ validateBeforeSave: false });
  try {
    await sendPasswordResetEmail(email, otp);
  } catch (err) {
    console.error('SMTP ERROR: Failed to send password reset email to', email, ':', err);
    throw new AppError('Password reset email could not be sent. Please check your SMTP configuration.', 500);
  }

  sendSuccess(res, 200, 'Password reset code sent to your email.', { email });
});

// ── Reset Password ────────────────────────────────────────────────────────────
const resetPassword = catchAsync(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const user = await User.findOne({ email }).select('+passwordResetOtp +passwordResetExpires');
  if (!user) throw new AppError('Account not found', 404);
  if (!user.passwordResetOtp || !user.passwordResetExpires) throw new AppError('No reset request found', 400);
  if (user.passwordResetExpires < new Date()) throw new AppError('Reset code expired', 400);
  if (!(await verifyOtp(otp, user.passwordResetOtp))) throw new AppError('Invalid reset code', 400);

  user.password = await bcrypt.hash(newPassword, 12);
  user.passwordResetOtp = undefined;
  user.passwordResetExpires = undefined;
  await user.save({ validateBeforeSave: false });

  sendSuccess(res, 200, 'Password reset successfully. Please log in.');
});

// ── Get Me ────────────────────────────────────────────────────────────────────
const getMe = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id).populate('wallet', 'balanceINR');
  sendSuccess(res, 200, 'User profile fetched.', { user: toPublicUser(user) });
});

// ── Logout ────────────────────────────────────────────────────────────────────
const logout = catchAsync(async (req, res) => {
  res.clearCookie('refreshToken');
  sendSuccess(res, 200, 'Logged out successfully.');
});

module.exports = { signup, verifyEmail, resendOtp, login, refreshAccessToken, forgotPassword, resetPassword, getMe, logout };
