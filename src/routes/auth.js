/**
 * auth.js — Authentication routes
 * @swagger
 * tags:
 *   name: Auth
 *   description: User authentication and authorization
 */
const express = require('express');
const { signup, verifyEmail, resendOtp, login, refreshAccessToken, forgotPassword, resetPassword, getMe, logout } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { body } = require('express-validator');

const router = express.Router();

const signupRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('phone').optional().trim(),
];

const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
];

router.post('/signup', signupRules, validate, signup);
router.post('/verify-email', [body('email').isEmail(), body('otp').isLength({ min: 6, max: 6 })], validate, verifyEmail);
router.post('/resend-otp', [body('email').isEmail()], validate, resendOtp);
router.post('/login', loginRules, validate, login);
router.post('/refresh-token', refreshAccessToken);
router.post('/forgot-password', [body('email').isEmail()], validate, forgotPassword);
router.post('/reset-password', [body('email').isEmail(), body('otp').isLength({ min: 6, max: 6 }), body('newPassword').isLength({ min: 8 })], validate, resetPassword);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;
