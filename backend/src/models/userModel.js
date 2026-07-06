const db = require('../config/db');

async function createUser({ email, phone, passwordHash, fullName }) {
  const result = await db.query(
    `INSERT INTO users (email, phone, password_hash, full_name)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, phone, full_name, role, kyc_status, two_fa_enabled, created_at`,
    [email, phone || null, passwordHash, fullName]
  );
  return result.rows[0];
}

async function findByEmail(email) {
  const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0];
}

async function findById(id) {
  const result = await db.query(
    `SELECT id, email, phone, full_name, role, kyc_status, two_fa_enabled,
            is_email_verified, is_phone_verified, status, created_at
     FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0];
}

async function updatePasswordHash(id, passwordHash) {
  await db.query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [
    passwordHash,
    id,
  ]);
}

async function setTwoFactorSecret(id, secret) {
  await db.query('UPDATE users SET two_fa_secret = $1 WHERE id = $2', [secret, id]);
}

async function enableTwoFactor(id) {
  await db.query('UPDATE users SET two_fa_enabled = TRUE WHERE id = $1', [id]);
}

async function listUsers({ limit = 50, offset = 0 } = {}) {
  const result = await db.query(
    `SELECT id, email, phone, full_name, role, kyc_status, status, created_at
     FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows;
}

async function updateStatus(id, status) {
  await db.query('UPDATE users SET status = $1, updated_at = now() WHERE id = $2', [status, id]);
}

module.exports = {
  createUser,
  findByEmail,
  findById,
  updatePasswordHash,
  setTwoFactorSecret,
  enableTwoFactor,
  listUsers,
  updateStatus,
};
