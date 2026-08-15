import { pool } from './db.js';
import { hashPassword } from './admin-auth.js';

const [email, password, role = 'viewer'] = process.argv.slice(2);
if (!email || !password || !['viewer','operator','treasury','superadmin'].includes(role)) {
  console.error('Usage: node create-admin.js <email> <password> [viewer|operator|treasury|superadmin]');
  process.exit(1);
}
const hash = hashPassword(password);
await pool.query(
  `INSERT INTO admin_users(email,password_hash,role) VALUES($1,$2,$3)
   ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash, role=EXCLUDED.role, is_active=TRUE, updated_at=NOW()`,
  [email.toLowerCase(), hash, role]
);
console.log(`Admin upserted: ${email.toLowerCase()} (${role})`);
await pool.end();
