const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../config/db');

function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

async function sendSms(to, body) {
  if (!process.env.TWILIO_ACCOUNT_SID) {
    console.log(`[otpService] Twilio not configured. Would send SMS to ${to}: ${body}`);
    return;
  }
  // Lazy-require so the app runs without the twilio package installed until it's needed
  const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  await twilio.messages.create({ to, from: process.env.TWILIO_FROM_NUMBER, body });
}

async function createAndSendOtp({ userId, phone, purpose }) {
  const code = generateOtp();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await db.query(
    `INSERT INTO otp_codes (user_id, channel, code_hash, purpose, expires_at)
     VALUES ($1, 'sms', $2, $3, $4)`,
    [userId, codeHash, purpose, expiresAt]
  );

  await sendSms(phone, `Your TradeFlow verification code is ${code}. It expires in 5 minutes.`);
}

async function verifyOtp({ userId, purpose, code }) {
  const result = await db.query(
    `SELECT * FROM otp_codes WHERE user_id = $1 AND purpose = $2 AND consumed = FALSE
     ORDER BY created_at DESC LIMIT 1`,
    [userId, purpose]
  );
  const record = result.rows[0];
  if (!record) return false;
  if (new Date(record.expires_at) < new Date()) return false;

  const match = await bcrypt.compare(code, record.code_hash);
  if (!match) return false;

  await db.query('UPDATE otp_codes SET consumed = TRUE WHERE id = $1', [record.id]);
  return true;
}

module.exports = { createAndSendOtp, verifyOtp };
