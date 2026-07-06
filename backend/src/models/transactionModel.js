const db = require('../config/db');

async function createTransaction({ userId, type, asset, amount, reference }) {
  const result = await db.query(
    `INSERT INTO transactions (user_id, type, asset, amount, reference)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [userId, type, asset, amount, reference || null]
  );
  return result.rows[0];
}

async function getUserTransactions(userId, { limit = 50, offset = 0 } = {}) {
  const result = await db.query(
    `SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows;
}

async function getPendingTransactions() {
  const result = await db.query(
    `SELECT t.*, u.email FROM transactions t JOIN users u ON u.id = t.user_id
     WHERE t.status = 'pending' ORDER BY t.created_at ASC`
  );
  return result.rows;
}

async function reviewTransaction(id, { status, adminId, note }) {
  const result = await db.query(
    `UPDATE transactions SET status = $1, reviewed_by = $2, admin_note = $3, updated_at = now()
     WHERE id = $4 RETURNING *`,
    [status, adminId, note || null, id]
  );
  return result.rows[0];
}

async function findById(id) {
  const result = await db.query('SELECT * FROM transactions WHERE id = $1', [id]);
  return result.rows[0];
}

module.exports = {
  createTransaction,
  getUserTransactions,
  getPendingTransactions,
  reviewTransaction,
  findById,
};
