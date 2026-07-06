const db = require('../config/db');

async function getWallets(userId) {
  const result = await db.query('SELECT * FROM wallets WHERE user_id = $1', [userId]);
  return result.rows;
}

async function getOrCreateWallet(userId, asset) {
  const existing = await db.query('SELECT * FROM wallets WHERE user_id = $1 AND asset = $2', [
    userId,
    asset,
  ]);
  if (existing.rows[0]) return existing.rows[0];

  const created = await db.query(
    `INSERT INTO wallets (user_id, asset, balance) VALUES ($1, $2, 0) RETURNING *`,
    [userId, asset]
  );
  return created.rows[0];
}

async function adjustBalance(userId, asset, delta) {
  const wallet = await getOrCreateWallet(userId, asset);
  const result = await db.query(
    `UPDATE wallets SET balance = balance + $1, updated_at = now()
     WHERE id = $2 RETURNING *`,
    [delta, wallet.id]
  );
  return result.rows[0];
}

async function lockFunds(userId, asset, amount) {
  const wallet = await getOrCreateWallet(userId, asset);
  const result = await db.query(
    `UPDATE wallets SET balance = balance - $1, locked_balance = locked_balance + $1, updated_at = now()
     WHERE id = $2 AND balance >= $1 RETURNING *`,
    [amount, wallet.id]
  );
  return result.rows[0]; // undefined if insufficient balance
}

async function releaseLockedFunds(userId, asset, amount) {
  const wallet = await getOrCreateWallet(userId, asset);
  const result = await db.query(
    `UPDATE wallets SET locked_balance = locked_balance - $1, updated_at = now()
     WHERE id = $2 RETURNING *`,
    [amount, wallet.id]
  );
  return result.rows[0];
}

module.exports = { getWallets, getOrCreateWallet, adjustBalance, lockFunds, releaseLockedFunds };
