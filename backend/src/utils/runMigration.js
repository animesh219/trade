require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, '../../migrations/schema.sql'), 'utf8');
  try {
    await db.query(sql);
    console.log('✅ Migration applied successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

run();
