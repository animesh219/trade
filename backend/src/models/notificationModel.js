const db = require('../config/db');

async function createNotification({ userId, title, message, type = 'info' }) {
  const result = await db.query(
    `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4) RETURNING *`,
    [userId, title, message, type]
  );
  return result.rows[0];
}

async function getUserNotifications(userId, { limit = 30 } = {}) {
  const result = await db.query(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
    [userId, limit]
  );
  return result.rows;
}

async function markRead(id, userId) {
  await db.query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2', [
    id,
    userId,
  ]);
}

async function broadcast({ title, message, type = 'info' }) {
  await db.query(
    `INSERT INTO notifications (user_id, title, message, type)
     SELECT id, $1, $2, $3 FROM users WHERE role = 'user'`,
    [title, message, type]
  );
}

module.exports = { createNotification, getUserNotifications, markRead, broadcast };
