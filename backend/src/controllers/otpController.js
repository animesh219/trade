const userModel = require('../models/userModel');
const otpService = require('../services/otpService');
const { signAccessToken, signRefreshToken } = require('../utils/jwt');
const db = require('../config/db');

async function requestOtp(req, res) {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone is required' });

  const result = await db.query('SELECT id FROM users WHERE phone = $1', [phone]);
  const user = result.rows[0];
  if (!user) return res.status(404).json({ error: 'No account found for this phone number' });

  await otpService.createAndSendOtp({ userId: user.id, phone, purpose: 'login' });
  return res.json({ message: 'OTP sent' });
}

async function verifyOtpLogin(req, res) {
  const { phone, code } = req.body;
  const result = await db.query('SELECT * FROM users WHERE phone = $1', [phone]);
  const user = result.rows[0];
  if (!user) return res.status(404).json({ error: 'No account found for this phone number' });

  const valid = await otpService.verifyOtp({ userId: user.id, purpose: 'login', code });
  if (!valid) return res.status(401).json({ error: 'Invalid or expired code' });

  await db.query('UPDATE users SET is_phone_verified = TRUE WHERE id = $1', [user.id]);

  const payload = { id: user.id, email: user.email, role: user.role };
  return res.json({
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role },
  });
}

module.exports = { requestOtp, verifyOtpLogin };
