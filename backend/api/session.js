import crypto from "crypto";
import { pool } from "./db.js";

const TTL_DAYS = 30;

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString("base64url");
  const hash = hashToken(token);
  await pool.query(
    `INSERT INTO sessions (user_id, token_hash, expires_at)
     VALUES ($1,$2,NOW() + INTERVAL '${TTL_DAYS} days')`,
    [userId, hash]
  );
  return token;
}

export async function getUserFromSession(token) {
  if (!token) return null;
  const { rows } = await pool.query(
    `SELECT u.* FROM sessions s
     JOIN users u ON u.id=s.user_id
     WHERE s.token_hash=$1 AND s.expires_at>NOW()`,
    [hashToken(token)]
  );
  return rows[0] || null;
}
