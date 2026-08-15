import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(here, 'migrations');

await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`);

const files = (await fs.readdir(dir)).filter(f => f.endsWith('.sql')).sort();
for (const file of files) {
  const exists = await pool.query('SELECT 1 FROM schema_migrations WHERE version=$1', [file]);
  if (exists.rowCount) continue;
  const sql = await fs.readFile(path.join(dir, file), 'utf8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations(version) VALUES($1)', [file]);
    await client.query('COMMIT');
    console.log(`Applied migration ${file}`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(`Migration failed: ${file}`);
    throw e;
  } finally { client.release(); }
}
await pool.end();
