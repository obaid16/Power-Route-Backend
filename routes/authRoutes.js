const express = require('express');
const { signup, verifyEmail, resendOtp, login, getMe, logout } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validateMiddleware');
const { signupRules, loginRules, verifyEmailRules, resendOtpRules } = require('../validators/authValidator');

const router = express.Router();

router.post('/signup',       signupRules,       validateRequest, signup);
router.post('/verify-email', verifyEmailRules,  validateRequest, verifyEmail);
router.post('/resend-otp',   resendOtpRules,    validateRequest, resendOtp);
router.post('/login',        loginRules,        validateRequest, login);
router.get('/me',            protect,           getMe);
router.post('/logout',       protect,           logout);

module.exports = router;
