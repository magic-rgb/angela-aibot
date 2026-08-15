/**
 * ANGELA — Strengthened Task Verification Service
 * Server-authoritative verification with multiple strategies.
 *
 * Modes:
 *  - telegram_member : Real membership check via Bot API (getChatMember)
 *  - link_visit      : Timed attempt token + anti-abuse guards
 *  - checkin         : Server-side daily check-in (no external proof)
 *
 * Security goals:
 *  - Never trust the client for completion
 *  - Single-use attempt tokens with min elapsed time
 *  - Per-user / per-task attempt limits
 *  - Strict Telegram membership verification when configured
 *  - Full audit trail
 */

import crypto from "node:crypto";
import { pool } from "./db.js";

// Tunables (can be overridden by env)
const ACTION_ATTEMPT_TTL_MS = Number(process.env.ACTION_ATTEMPT_TTL_MS || 5 * 60 * 1000); // 5 min
const ACTION_MIN_SECONDS_DEFAULT = Number(process.env.ACTION_MIN_SECONDS || 12);         // raised from 8
const MAX_ATTEMPTS_PER_TASK_PER_DAY = Number(process.env.MAX_TASK_ATTEMPTS_PER_DAY || 8);
const TELEGRAM_API = "https://api.telegram.org";

function issueAttemptToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashAttemptToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

/**
 * Create a single-use attempt token for a task/daily action.
 * Enforces daily attempt quota.
 */
export async function createActionAttempt(userId, actionType, actionId, options = {}) {
  const minSeconds = options.minSeconds ?? ACTION_MIN_SECONDS_DEFAULT;
  const ttlMs = options.ttlMs ?? ACTION_ATTEMPT_TTL_MS;

  // Daily attempt limit (anti-abuse)
  const countQ = await pool.query(
    `SELECT COUNT(*)::int AS c
       FROM action_attempts
      WHERE user_id = $1
        AND action_type = $2
        AND action_id = $3
        AND started_at >= CURRENT_DATE`,
    [userId, actionType, actionId]
  );
  if (countQ.rows[0].c >= MAX_ATTEMPTS_PER_TASK_PER_DAY) {
    const err = new Error("TOO_MANY_ATTEMPTS");
    err.code = "TOO_MANY_ATTEMPTS";
    throw err;
  }

  const token = issueAttemptToken();
  const now = Date.now();
  await pool.query(
    `INSERT INTO action_attempts(token_hash, user_id, action_type, action_id, started_at, expires_at)
     VALUES ($1, $2, $3, $4, NOW(), to_timestamp($5 / 1000.0))`,
    [hashAttemptToken(token), userId, actionType, actionId, now + ttlMs]
  );

  return {
    token,
    expiresAt: new Date(now + ttlMs).toISOString(),
    minSeconds,
    maxAttemptsPerDay: MAX_ATTEMPTS_PER_TASK_PER_DAY
  };
}

/**
 * Consume (and validate) an attempt token inside a transaction.
 * Throws on any invalid state.
 */
export async function consumeActionAttempt(client, userId, actionType, actionId, token, options = {}) {
  const minSeconds = options.minSeconds ?? ACTION_MIN_SECONDS_DEFAULT;

  if (!token) {
    const err = new Error("ACTION_ATTEMPT_REQUIRED");
    err.code = "ACTION_ATTEMPT_REQUIRED";
    throw err;
  }

  const q = await client.query(
    `SELECT id, started_at, expires_at, consumed_at
       FROM action_attempts
      WHERE token_hash = $1
        AND user_id = $2
        AND action_type = $3
        AND action_id = $4
      FOR UPDATE`,
    [hashAttemptToken(String(token)), userId, actionType, actionId]
  );

  if (!q.rowCount) {
    const err = new Error("ACTION_ATTEMPT_INVALID");
    err.code = "ACTION_ATTEMPT_INVALID";
    throw err;
  }

  const row = q.rows[0];
  if (row.consumed_at) {
    const err = new Error("ACTION_ATTEMPT_USED");
    err.code = "ACTION_ATTEMPT_USED";
    throw err;
  }
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    const err = new Error("ACTION_ATTEMPT_EXPIRED");
    err.code = "ACTION_ATTEMPT_EXPIRED";
    throw err;
  }

  const elapsed = (Date.now() - new Date(row.started_at).getTime()) / 1000;
  if (elapsed < minSeconds) {
    const err = new Error("ACTION_TOO_FAST");
    err.code = "ACTION_TOO_FAST";
    err.meta = { elapsed, required: minSeconds };
    throw err;
  }

  await client.query(`UPDATE action_attempts SET consumed_at = NOW() WHERE id = $1`, [row.id]);
  return { attemptId: row.id, elapsedSeconds: elapsed };
}

/**
 * Real Telegram membership verification via Bot API.
 * Bot must be an administrator in the target channel/group.
 *
 * @param {number|string} telegramUserId
 * @param {string} chatId  - e.g. "@angelaCommunity" or numeric id "-100..."
 * @returns {Promise<{ok:boolean, status?:string, error?:string}>}
 */
export async function verifyTelegramMembership(telegramUserId, chatId) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return { ok: false, error: "BOT_TOKEN_MISSING" };
  }
  if (!chatId) {
    return { ok: false, error: "CHAT_ID_MISSING" };
  }

  const url = `${TELEGRAM_API}/bot${botToken}/getChatMember`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        user_id: Number(telegramUserId)
      })
    });

    const data = await res.json();
    if (!data.ok) {
      // Common: bot is not admin, user never interacted, chat not found, etc.
      return {
        ok: false,
        error: data.description || "TELEGRAM_API_ERROR",
        raw: data
      };
    }

    const status = data.result?.status;
    // member, administrator, creator, restricted (still in chat) are considered valid
    const validStatuses = new Set(["member", "administrator", "creator", "restricted"]);
    if (validStatuses.has(status)) {
      return { ok: true, status };
    }

    // left / kicked / etc.
    return { ok: false, status, error: "NOT_A_MEMBER" };
  } catch (e) {
    return { ok: false, error: "TELEGRAM_REQUEST_FAILED", detail: String(e.message || e) };
  }
}

/**
 * High-level verification dispatcher.
 * Returns { verified: true } or throws / returns { verified: false, reason }.
 */
export async function verifyTaskAction({ task, user, attemptToken, client }) {
  const mode = task.mode || task.verification || "link_visit";

  if (mode === "telegram_member") {
    // 1. Consume attempt (still required as anti-spam gate)
    await consumeActionAttempt(client, user.id, "task", task.id, attemptToken, {
      minSeconds: task.minSeconds ?? ACTION_MIN_SECONDS_DEFAULT
    });

    // 2. Real membership check
    const chatId = task.chatId || task.telegramChatId;
    if (!chatId) {
      const err = new Error("TASK_MISCONFIGURED");
      err.code = "TASK_MISCONFIGURED";
      throw err;
    }

    const result = await verifyTelegramMembership(user.telegram_user_id, chatId);
    if (!result.ok) {
      const err = new Error(result.error || "TELEGRAM_MEMBERSHIP_FAILED");
      err.code = result.error || "TELEGRAM_MEMBERSHIP_FAILED";
      err.meta = { status: result.status };
      throw err;
    }

    return { verified: true, method: "telegram_member", status: result.status };
  }

  if (mode === "link_visit") {
    await consumeActionAttempt(client, user.id, "task", task.id, attemptToken, {
      minSeconds: task.minSeconds ?? ACTION_MIN_SECONDS_DEFAULT
    });
    return { verified: true, method: "link_visit" };
  }

  if (mode === "checkin") {
    // Daily check-in does not need external proof
    return { verified: true, method: "checkin" };
  }

  const err = new Error("VERIFICATION_NOT_CONFIGURED");
  err.code = "VERIFICATION_NOT_CONFIGURED";
  throw err;
}

export const VERIFICATION_CONFIG = {
  ACTION_ATTEMPT_TTL_MS,
  ACTION_MIN_SECONDS_DEFAULT,
  MAX_ATTEMPTS_PER_TASK_PER_DAY
};
