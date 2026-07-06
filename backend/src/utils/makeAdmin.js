/**
 * Usage: node src/utils/makeAdmin.js user@example.com
 * Promotes an existing user to the 'admin' role.
 */
require('dotenv').config();
const db = require('../config/db');

async function run() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node src/utils/makeAdmin.js <email>');
    process.exit(1);
  }
  const result = await db.query("UPDATE users SET role = 'admin' WHERE email = $1 RETURNING id, email, role", [email]);
  if (result.rows.length === 0) {
    console.error(`No user found with email ${email}`);
  } else {
    console.log('✅ Promoted to admin:', result.rows[0]);
  }
  process.exit(0);
}

run();
