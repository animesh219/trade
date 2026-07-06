const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const crypto = require('crypto');
const { z } = require('zod');

const userModel = require('../models/userModel');
const walletModel = require('../models/walletModel');
const auditModel = require('../models/auditModel');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { sendMail } = require('../services/mailService');

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(1),
  phone: z.string().optional(),
});

async function register(req, res) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }
  const { email, password, fullName, phone } = parsed.data;

  const existing = await userModel.findByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await userModel.createUser({ email, phone, passwordHash, fullName });

  // Seed a USDT wallet so the user has something to view/deposit into
  await walletModel.getOrCreateWallet(user.id, 'USDT');

  await auditModel.log({ actorId: user.id, action: 'user_registered', entity: 'user', entityId: user.id });

  sendMail({
    to: email,
    subject: 'Welcome to TradeFlow',
    text: `Hi ${fullName}, your account has been created. Please verify your email to get started.`,
  }).catch((e) => console.error('Email send failed:', e.message));

  return res.status(201).json({ message: 'Account created', user });
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  twoFactorToken: z.string().optional(),
});

async function login(req, res) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }
  const { email, password, twoFactorToken } = parsed.data;

  const user = await userModel.findByEmail(email);
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  if (user.status !== 'active') {
    return res.status(403).json({ error: `Account is ${user.status}` });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

  if (user.two_fa_enabled) {
    if (!twoFactorToken) {
      return res.status(200).json({ requiresTwoFactor: true });
    }
    const verified = speakeasy.totp.verify({
      secret: user.two_fa_secret,
      encoding: 'base32',
      token: twoFactorToken,
      window: 1,
    });
    if (!verified) return res.status(401).json({ error: 'Invalid 2FA code' });
  }

  const payload = { id: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await auditModel.log({ actorId: user.id, action: 'user_login', entity: 'user', entityId: user.id, ipAddress: req.ip });

  return res.json({
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role, kycStatus: user.kyc_status },
  });
}

async function refresh(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken is required' });
  try {
    const decoded = verifyRefreshToken(refreshToken);
    const accessToken = signAccessToken({ id: decoded.id, email: decoded.email, role: decoded.role });
    return res.json({ accessToken });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
}

// --- 2FA setup ---
async function setupTwoFactor(req, res) {
  const secret = speakeasy.generateSecret({ name: `TradeFlow (${req.user.email})` });
  await userModel.setTwoFactorSecret(req.user.id, secret.base32);
  const qrDataUrl = await qrcode.toDataURL(secret.otpauth_url);
  return res.json({ secret: secret.base32, qrCode: qrDataUrl });
}

async function verifyTwoFactor(req, res) {
  const { token } = req.body;
  const user = await userModel.findByEmail(req.user.email);
  const verified = speakeasy.totp.verify({
    secret: user.two_fa_secret,
    encoding: 'base32',
    token,
    window: 1,
  });
  if (!verified) return res.status(400).json({ error: 'Invalid code' });
  await userModel.enableTwoFactor(req.user.id);
  return res.json({ message: '2FA enabled' });
}

// --- Forgot / reset password ---
// In-memory reset token store for demo purposes; use Redis or a DB table in production.
const resetTokens = new Map();

async function forgotPassword(req, res) {
  const { email } = req.body;
  const user = await userModel.findByEmail(email);
  // Always respond 200 to avoid leaking which emails are registered
  if (!user) return res.json({ message: 'If that email exists, a reset link has been sent' });

  const token = crypto.randomBytes(32).toString('hex');
  resetTokens.set(token, { userId: user.id, expires: Date.now() + 15 * 60 * 1000 });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
  sendMail({
    to: email,
    subject: 'Reset your TradeFlow password',
    text: `Reset your password here: ${resetUrl} (expires in 15 minutes)`,
  }).catch((e) => console.error('Email send failed:', e.message));

  return res.json({ message: 'If that email exists, a reset link has been sent' });
}

async function resetPassword(req, res) {
  const { token, newPassword } = req.body;
  const entry = resetTokens.get(token);
  if (!entry || entry.expires < Date.now()) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await userModel.updatePasswordHash(entry.userId, passwordHash);
  resetTokens.delete(token);
  await auditModel.log({ actorId: entry.userId, action: 'password_reset' });
  return res.json({ message: 'Password updated successfully' });
}

async function me(req, res) {
  const user = await userModel.findById(req.user.id);
  return res.json({ user });
}

module.exports = {
  register,
  login,
  refresh,
  setupTwoFactor,
  verifyTwoFactor,
  forgotPassword,
  resetPassword,
  me,
};
