const db = require('../config/db');

async function log({ actorId, action, entity, entityId, metadata, ipAddress }) {
  await db.query(
    `INSERT INTO audit_logs (actor_id, action, entity, entity_id, metadata, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [actorId || null, action, entity || null, entityId || null, metadata || {}, ipAddress || null]
  );
}

async function getRecent({ limit = 100 } = {}) {
  const result = await db.query(
    `SELECT a.*, u.email AS actor_email FROM audit_logs a
     LEFT JOIN users u ON u.id = a.actor_id
     ORDER BY a.created_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
}

module.exports = { log, getRecent };
