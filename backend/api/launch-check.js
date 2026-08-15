import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = new URL('.', import.meta.url).pathname;
const required = [
  'server.js','db.js','session.js','telegram-auth.js','admin-auth.js','wallet-service.js',
  'withdrawal-service.js','rate-limit.js','migrate.js','task-verification.js'
];
const missing = required.filter(f => !fs.existsSync(root + f));
if (missing.length) { console.error('Missing:', missing.join(', ')); process.exit(1); }

for (const f of required.filter(x => x.endsWith('.js'))) {
  execFileSync(process.execPath, ['--check', root + f], { stdio: 'inherit' });
}

const env = process.env;
const requiredEnv = ['DATABASE_URL','TELEGRAM_BOT_TOKEN','FRONTEND_ORIGIN','MFA_ENCRYPTION_KEY'];
const missingEnv = requiredEnv.filter(k => !env[k] || env[k].includes('replace'));
if (String(env.NODE_ENV).toLowerCase() === 'production' && missingEnv.length) {
  console.error('Production environment is missing:', missingEnv.join(', '));
  process.exit(1);
}
if (String(env.WITHDRAWALS_ENABLED || 'false').toLowerCase() === 'true') {
  console.error('Launch check intentionally expects withdrawals closed in the handoff build.');
  process.exit(1);
}
if (String(env.WALLET_ENABLED || 'false').toLowerCase() === 'true') {
  console.error('Launch check intentionally expects wallet closed in the handoff build.');
  process.exit(1);
}
console.log('ANGELA launch handoff checks passed. Wallet=closed, Withdrawals=closed.');
