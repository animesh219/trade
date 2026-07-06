const router = require('express').Router();
const auth = require('../controllers/authController');
const otp = require('../controllers/otpController');
const { requireAuth } = require('../middleware/auth');

router.post('/register', auth.register);
router.post('/login', auth.login);
router.post('/refresh', auth.refresh);
router.post('/forgot-password', auth.forgotPassword);
router.post('/reset-password', auth.resetPassword);
router.get('/me', requireAuth, auth.me);

// 2FA
router.post('/2fa/setup', requireAuth, auth.setupTwoFactor);
router.post('/2fa/verify', requireAuth, auth.verifyTwoFactor);

// Mobile OTP login
router.post('/otp/request', otp.requestOtp);
router.post('/otp/verify', otp.verifyOtpLogin);

module.exports = router;
