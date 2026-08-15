import crypto from 'node:crypto';
import { pool } from './db.js';

const SESSION_DAYS = 8;
const COOKIE_NAME = 'angela_admin_session';
const MFA_CHALLENGE_MINUTES = 5;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password, encoded) {
  const [scheme, salt, stored] = String(encoded || '').split('$');
  if (scheme !== 'scrypt' || !salt || !stored) return false;
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return derived.length === stored.length && crypto.timingSafeEqual(Buffer.from(derived), Buffer.from(stored));
}

function base32Decode(input) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = String(input || '').replace(/=+$/,'').replace(/\s+/g,'').toUpperCase();
  let bits = 0, value = 0, out = [];
  for (const ch of clean) {
    const idx = alphabet.indexOf(ch);
    if (idx < 0) throw new Error('INVALID_MFA_SECRET');
    value = (value << 5) | idx; bits += 5;
    if (bits >= 8) { bits -= 8; out.push((value >> bits) & 255); }
  }
  return Buffer.from(out);
}

function base32Encode(buf) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, value = 0, out = '';
  for (const byte of buf) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { bits -= 5; out += alphabet[(value >> bits) & 31]; }
  }
  if (bits) out += alphabet[(value << (5-bits)) & 31];
  return out;
}

function totp(secret, counter) {
  const key = base32Decode(secret);
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac('sha1', key).update(msg).digest();
  const offset = digest[digest.length - 1] & 15;
  const code = ((digest[offset] & 127) << 24) | (digest[offset+1] << 16) | (digest[offset+2] << 8) | digest[offset+3];
  return String(code % 1_000_000).padStart(6, '0');
}

export function generateMfaSecret() {
  return base32Encode(crypto.randomBytes(20));
}

export function verifyTotp(secret, code, window = 1) {
  const normalized = String(code || '').replace(/\D/g, '');
  if (normalized.length !== 6) return false;
  const counter = Math.floor(Date.now() / 1000 / 30);
  for (let offset = -window; offset <= window; offset++) {
    if (crypto.timingSafeEqual(Buffer.from(totp(secret, counter + offset)), Buffer.from(normalized))) return true;
  }
  return false;
}

function encryptSecret(secret) {
  const keyMaterial = process.env.MFA_ENCRYPTION_KEY;
  if (!keyMaterial) throw new Error('MFA_ENCRYPTION_KEY_REQUIRED');
  const key = crypto.createHash('sha256').update(keyMaterial).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${ciphertext.toString('base64url')}`;
}

function decryptSecret(encoded) {
  const keyMaterial = process.env.MFA_ENCRYPTION_KEY;
  if (!keyMaterial) throw new Error('MFA_ENCRYPTION_KEY_REQUIRED');
  const [, ivB64, tagB64, dataB64] = String(encoded || '').split('.');
  const key = crypto.createHash('sha256').update(keyMaterial).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64url')), decipher.final()]).toString('utf8');
}

export async function createAdminSession(adminId, mfaVerified = false) {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  await pool.query(
    `INSERT INTO admin_sessions(admin_user_id, token_hash, expires_at, mfa_verified_at) VALUES($1,$2,NOW()+$3::interval,$4)`,
    [adminId, tokenHash, `${SESSION_DAYS} days`, mfaVerified ? new Date() : null]
  );
  return token;
}

export async function getAdminFromRequest(req) {
  const bearer = req.get('authorization');
  const cookie = req.cookies?.[COOKIE_NAME];
  const token = bearer?.startsWith('Bearer ') ? bearer.slice(7) : cookie;
  if (!token) return null;
  const tokenHash = hashToken(token);
  const q = await pool.query(
    `SELECT a.id,a.email,a.role,a.is_active,a.mfa_enabled,s.id AS session_id
     FROM admin_sessions s JOIN admin_users a ON a.id=s.admin_user_id
     WHERE s.token_hash=$1 AND s.expires_at>NOW() AND a.is_active=TRUE
       AND (a.mfa_enabled=FALSE OR s.mfa_verified_at IS NOT NULL)`, [tokenHash]
  );
  if (!q.rowCount) return null;
  await pool.query(`UPDATE admin_sessions SET last_seen_at=NOW() WHERE id=$1`, [q.rows[0].session_id]);
  return q.rows[0];
}

export async function revokeAdminSession(req) {
  const bearer = req.get('authorization');
  const token = bearer?.startsWith('Bearer ') ? bearer.slice(7) : req.cookies?.[COOKIE_NAME];
  if (token) await pool.query(`DELETE FROM admin_sessions WHERE token_hash=$1`, [hashToken(token)]);
}

export async function createMfaChallenge(adminId) {
  const token = crypto.randomBytes(32).toString('base64url');
  await pool.query(`DELETE FROM admin_mfa_challenges WHERE admin_user_id=$1 OR expires_at<=NOW()`, [adminId]);
  await pool.query(
    `INSERT INTO admin_mfa_challenges(admin_user_id,challenge_hash,expires_at)
     VALUES($1,$2,NOW()+INTERVAL '${MFA_CHALLENGE_MINUTES} minutes')`,
    [adminId, hashToken(token)]
  );
  return token;
}

export async function consumeMfaChallenge(token, adminId, code) {
  const tokenHash = hashToken(token);
  const q = await pool.query(
    `SELECT id,admin_user_id,attempts FROM admin_mfa_challenges
     WHERE challenge_hash=$1 AND admin_user_id=$2 AND expires_at>NOW()`,
    [tokenHash, adminId]
  );
  if (!q.rowCount) return false;
  const row = q.rows[0];
  if (row.attempts >= 5) return false;
  const secretQ = await pool.query(`SELECT mfa_secret_encrypted FROM admin_users WHERE id=$1 AND is_active=TRUE`, [adminId]);
  let ok = false;
  try { ok = verifyTotp(decryptSecret(secretQ.rows[0]?.mfa_secret_encrypted), code, 1); } catch {}
  if (!ok) {
    await pool.query(`UPDATE admin_mfa_challenges SET attempts=attempts+1 WHERE id=$1`, [row.id]);
    return false;
  }
  await pool.query(`DELETE FROM admin_mfa_challenges WHERE id=$1`, [row.id]);
  return true;
}

export async function beginMfaEnrollment(adminId) {
  const secret = generateMfaSecret();
  await pool.query(`UPDATE admin_users SET mfa_secret_encrypted=$1 WHERE id=$2`, [encryptSecret(secret), adminId]);
  return secret;
}

export async function confirmMfaEnrollment(adminId, code) {
  const q = await pool.query(`SELECT mfa_secret_encrypted FROM admin_users WHERE id=$1 AND is_active=TRUE`, [adminId]);
  if (!q.rowCount || !q.rows[0].mfa_secret_encrypted) return false;
  try {
    if (!verifyTotp(decryptSecret(q.rows[0].mfa_secret_encrypted), code, 1)) return false;
    await pool.query(`UPDATE admin_users SET mfa_enabled=TRUE,updated_at=NOW() WHERE id=$1`, [adminId]);
    return true;
  } catch { return false; }
}

export async function disableMfa(adminId) {
  await pool.query(`UPDATE admin_users SET mfa_enabled=FALSE,mfa_secret_encrypted=NULL,updated_at=NOW() WHERE id=$1`, [adminId]);
}

export async function cleanupAdminSessions() {
  const r = await pool.query(`DELETE FROM admin_sessions WHERE expires_at<=NOW() OR last_seen_at < NOW()-INTERVAL '30 days'`);
  await pool.query(`DELETE FROM admin_mfa_challenges WHERE expires_at<=NOW()`);
  return r.rowCount;
}

export const ADMIN_COOKIE = COOKIE_NAME;
export const ADMIN_ROLES = Object.freeze({ viewer: 10, operator: 20, treasury: 30, superadmin: 40 });
