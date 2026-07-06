const db = require('../config/db');

async function submitDocument({ userId, docType, filePath }) {
  const result = await db.query(
    `INSERT INTO kyc_documents (user_id, doc_type, file_path) VALUES ($1, $2, $3) RETURNING *`,
    [userId, docType, filePath]
  );
  await db.query(`UPDATE users SET kyc_status = 'pending' WHERE id = $1`, [userId]);
  return result.rows[0];
}

async function getUserDocuments(userId) {
  const result = await db.query(
    'SELECT * FROM kyc_documents WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
}

async function getPendingDocuments() {
  const result = await db.query(
    `SELECT k.*, u.email FROM kyc_documents k JOIN users u ON u.id = k.user_id
     WHERE k.status = 'pending' ORDER BY k.created_at ASC`
  );
  return result.rows;
}

async function reviewDocument(id, { status, adminId, note, userId }) {
  const result = await db.query(
    `UPDATE kyc_documents SET status = $1, reviewed_by = $2, review_note = $3, updated_at = now()
     WHERE id = $4 RETURNING *`,
    [status, adminId, note || null, id]
  );
  await db.query('UPDATE users SET kyc_status = $1 WHERE id = $2', [status, userId]);
  return result.rows[0];
}

module.exports = { submitDocument, getUserDocuments, getPendingDocuments, reviewDocument };
