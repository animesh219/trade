const bcrypt = require('bcryptjs');
const db = require('../config/db');
const userModel = require('../models/userModel');

async function updateProfile(req, res) {
  const { fullName, phone } = req.body;
  await db.query('UPDATE users SET full_name = COALESCE($1, full_name), phone = COALESCE($2, phone), updated_at = now() WHERE id = $3', [
    fullName,
    phone,
    req.user.id,
  ]);
  const user = await userModel.findById(req.user.id);
  return res.json({ user });
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
  if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

  const hash = await bcrypt.hash(newPassword, 12);
  await userModel.updatePasswordHash(req.user.id, hash);
  return res.json({ message: 'Password changed successfully' });
}

module.exports = { updateProfile, changePassword };
