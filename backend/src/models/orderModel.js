const db = require('../config/db');

async function createOrder({
  userId,
  symbol,
  side,
  orderType,
  quantity,
  limitPrice,
  stopPrice,
}) {
  const result = await db.query(
    `INSERT INTO orders (user_id, symbol, side, order_type, quantity, limit_price, stop_price)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [userId, symbol, side, orderType, quantity, limitPrice || null, stopPrice || null]
  );
  return result.rows[0];
}

async function markFilled(orderId, { exchangeOrderId, filledPrice }) {
  const result = await db.query(
    `UPDATE orders SET status = 'filled', exchange_order_id = $1, filled_price = $2, filled_at = now()
     WHERE id = $3 RETURNING *`,
    [exchangeOrderId, filledPrice, orderId]
  );
  return result.rows[0];
}

async function markRejected(orderId) {
  const result = await db.query(
    `UPDATE orders SET status = 'rejected' WHERE id = $1 RETURNING *`,
    [orderId]
  );
  return result.rows[0];
}

async function getUserOrders(userId, { limit = 50, offset = 0 } = {}) {
  const result = await db.query(
    `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows;
}

async function getAllOrders({ limit = 100, offset = 0 } = {}) {
  const result = await db.query(
    `SELECT o.*, u.email FROM orders o JOIN users u ON u.id = o.user_id
     ORDER BY o.created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows;
}

module.exports = { createOrder, markFilled, markRejected, getUserOrders, getAllOrders };
