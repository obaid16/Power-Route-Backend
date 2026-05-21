const { body } = require('express-validator');

const signupRules = [
  body('name')
    .trim().notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name too long'),
  body('email')
    .isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone')
    .optional()
    .trim()
    .matches(/^[+\d\s\-().]{7,20}$/)
    .withMessage('Invalid phone number format'),
  body('password')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be 8–128 characters')
    .matches(/[A-Za-z]/).withMessage('Password must contain at least one letter')
    .matches(/\d/).withMessage('Password must contain at least one number'),
];

const verifyEmailRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('otp')
    .trim().notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must be numeric'),
];

const resendOtpRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
];

const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

module.exports = { signupRules, verifyEmailRules, resendOtpRules, loginRules };
