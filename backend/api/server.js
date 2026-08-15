import express from "express";
import crypto from "node:crypto";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { pool, tx } from "./db.js";
import { createSession, getUserFromSession } from "./session.js";
import { verifyTelegramInitData } from "./telegram-auth.js";
import {
  getWalletSnapshot,
  requestWithdrawal
} from "./wallet-service.js";
import { listPendingWithdrawals, approveWithdrawal, rejectWithdrawal, completeWithdrawal } from "./withdrawal-service.js";
import { getAdminFromRequest, createAdminSession, revokeAdminSession, verifyPassword, createMfaChallenge, consumeMfaChallenge, beginMfaEnrollment, confirmMfaEnrollment, disableMfa, cleanupAdminSessions, ADMIN_COOKIE, ADMIN_ROLES } from "./admin-auth.js";
import { allowRateLimit, rateLimitBackend } from "./rate-limit.js";
import {
  createActionAttempt,
  consumeActionAttempt,
  verifyTaskAction,
  VERIFICATION_CONFIG
} from "./task-verification.js";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const COOKIE_SECURE = process.env.COOKIE_SECURE !== "false";
const allowedOrigin = process.env.FRONTEND_ORIGIN || false;
const COOKIE_SAMESITE = process.env.COOKIE_SAMESITE || "none";

app.use(helmet());
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use((req, res, next) => {
  const requestId = crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
});

async function adminAuth(req, res, next) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return res.status(401).json({ error: "ADMIN_UNAUTHORIZED" });
    req.admin = admin;
    next();
  } catch {
    res.status(500).json({ error: "ADMIN_AUTH_ERROR" });
  }
}

function requireRole(minRole) {
  return (req, res, next) => {
    if (!req.admin || ADMIN_ROLES[req.admin.role] < ADMIN_ROLES[minRole]) {
      return res.status(403).json({ error: "ADMIN_FORBIDDEN" });
    }
    next();
  };
}

function guarded(req, res, next) {
  const key = `${req.ip}:${req.path}`;
  allowRateLimit(key).then(ok => {
    if (!ok) return res.status(429).json({ error: "RATE_LIMITED" });
    next();
  }).catch(() => res.status(503).json({ error: "RATE_LIMIT_UNAVAILABLE" }));
}

async function auth(req, res, next) {
  try {
    const user = await getUserFromSession(req.cookies.angela_session);
    if (!user) return res.status(401).json({ error: "UNAUTHORIZED" });
    req.user = user;
    next();
  } catch {
    res.status(500).json({ error: "AUTH_ERROR" });
  }
}

async function audit(userId, action, metadata = {}) {
  try {
    await pool.query(
      `INSERT INTO audit_logs(user_id,action,metadata) VALUES($1,$2,$3)`,
      [userId, action, JSON.stringify(metadata)]
    );
  } catch {}
}

async function adminAudit(action, withdrawalId = null, metadata = {}) {
  try {
    await pool.query(
      `INSERT INTO admin_audit_logs(action,withdrawal_id,metadata) VALUES($1,$2,$3)`,
      [action, withdrawalId, JSON.stringify(metadata)]
    );
  } catch {}
}

// Attempt / verification logic moved to task-verification.js (stronger anti-abuse + real Telegram checks)

async function awardReferralMilestone(client, referrerId) {
  const q = await client.query(
    `SELECT COUNT(*)::int AS qualified FROM referrals WHERE referrer_user_id=$1 AND qualified=true`,
    [referrerId]
  );
  if (Number(q.rows[0].qualified) < 3) return false;
  const reference = `referral-milestone:${referrerId}:3`;
  const inserted = await client.query(
    `INSERT INTO points_ledger(user_id,amount,reason,reference_id)
     VALUES($1,2500,'referral_milestone',$2)
     ON CONFLICT (user_id,reference_id) DO NOTHING RETURNING id`,
    [referrerId, reference]
  );
  if (!inserted.rowCount) return false;
  await client.query(`UPDATE users SET points=points+2500,xp=xp+2500,updated_at=NOW() WHERE id=$1`, [referrerId]);
  await client.query(`INSERT INTO audit_logs(user_id,action,metadata) VALUES($1,'referral_milestone_reward',$2)`, [referrerId, JSON.stringify({ milestone: 3, reward: 2500 })]);
  return true;
}

const TASKS = [
  // Primary — real membership check (bot must be admin in the channel)
  {
    id: "tg_join",
    platform: "TELEGRAM",
    title: "Join ANGELA Community",
    desc: "Join the official ANGELA community channel and stay active.",
    reward: 1000,
    url: "https://t.me/angelaCommunity",
    mode: "telegram_member",
    verification: "telegram_member",
    chatId: "@angelaCommunity",          // change to your real channel username or numeric id
    minSeconds: 15
  },
  // Primary — link visit with stronger timing
  {
    id: "x_follow",
    platform: "X",
    title: "Follow on X (Twitter)",
    desc: "Open the official ANGELA X profile.",
    reward: 500,
    url: "https://x.com/Angelaxai",
    mode: "link_visit",
    verification: "link_visit",
    minSeconds: 12
  },
  {
    id: "discord_join",
    platform: "DISCORD",
    title: "Join Discord Server",
    desc: "Open the official ANGELA Discord community.",
    reward: 500,
    url: "https://discord.gg/CSqtGeq6r",
    mode: "link_visit",
    verification: "link_visit",
    minSeconds: 12
  },
  {
    id: "yt_subscribe",
    platform: "YOUTUBE",
    title: "Subscribe on YouTube",
    desc: "Open the official ANGELA YouTube channel.",
    reward: 500,
    url: "https://youtube.com/@angelaxai",
    mode: "link_visit",
    verification: "link_visit",
    minSeconds: 12
  },
  // Secondary
  {
    id: "x_alexa",
    platform: "X",
    title: "Visit Alexa Rodriguez on X",
    reward: 250,
    url: "https://x.com/Alexauiux",
    mode: "link_visit",
    verification: "link_visit",
    minSeconds: 10
  },
  {
    id: "x_ceo",
    platform: "X",
    title: "Visit CEO on X",
    reward: 250,
    url: "https://x.com/ameliui",
    mode: "link_visit",
    verification: "link_visit",
    minSeconds: 10
  },
  {
    id: "x_cto",
    platform: "X",
    title: "Visit CTO on X",
    reward: 300,
    url: "https://x.com/Elenacto",
    mode: "link_visit",
    verification: "link_visit",
    minSeconds: 10
  }
];

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      ok: true,
      db: true,
      version: "launch-ready-v24.2-strong-verify",
      rateLimitBackend: rateLimitBackend(),
      withdrawalsEnabled: String(process.env.WITHDRAWALS_ENABLED || "false").toLowerCase() === "true",
      verification: VERIFICATION_CONFIG
    });
  } catch {
    res.status(503).json({ ok: false, db: false });
  }
});

app.post("/api/auth/telegram", guarded, async (req, res) => {
  try {
    const tgUser = verifyTelegramInitData(req.body?.initData, process.env.TELEGRAM_BOT_TOKEN);
    if (!tgUser?.id) return res.status(400).json({ error: "INVALID_TELEGRAM_USER" });
    const referralCode = `ANG-${String(tgUser.id)}`;
    const startParam = String(tgUser.start_param || req.body?.startParam || "").trim();
    const result = await tx(async client => {
      const existing = await client.query(`SELECT * FROM users WHERE telegram_user_id=$1`, [tgUser.id]);
      const isNew = !existing.rowCount;
      let referredBy = null;
      if (isNew && startParam) {
        const ref = await client.query(`SELECT id FROM users WHERE referral_code=$1`, [startParam]);
        if (ref.rowCount && Number(ref.rows[0].id) !== Number(existing.rows[0]?.id)) referredBy = ref.rows[0].id;
      }
      const q = await client.query(
        `INSERT INTO users(telegram_user_id,username,first_name,last_name,referral_code,referred_by)
         VALUES($1,$2,$3,$4,$5,$6)
         ON CONFLICT(telegram_user_id) DO UPDATE SET
           username=EXCLUDED.username, first_name=EXCLUDED.first_name,
           last_name=EXCLUDED.last_name, updated_at=NOW()
         RETURNING *`,
        [tgUser.id, tgUser.username || null, tgUser.first_name || null, tgUser.last_name || null, referralCode, referredBy]
      );
      const user = q.rows[0];
      if (isNew && referredBy && Number(referredBy) !== Number(user.id)) {
        await client.query(`INSERT INTO referrals(referrer_user_id,referred_user_id) VALUES($1,$2) ON CONFLICT(referred_user_id) DO NOTHING`, [referredBy, user.id]);
      }
      return user;
    });
    const token = await createSession(result.id);
    res.cookie("angela_session", token, {
      httpOnly: true, secure: COOKIE_SECURE, sameSite: COOKIE_SAMESITE, maxAge: 30 * 86400 * 1000, path: "/"
    });
    await audit(result.id, "telegram_login");
    res.json({ ok: true, user: { id: result.id, username: result.username, points: result.points, xp: result.xp } });
  } catch (e) {
    res.status(401).json({ error: e.message || "AUTH_FAILED" });
  }
});

app.get("/api/me", auth, async (req, res) => {
  const wallet = await getWalletSnapshot(req.user.id, req.user.points);
  res.json({
    user: {
      id: req.user.id, telegramUserId: req.user.telegram_user_id,
      username: req.user.username, points: req.user.points, xp: req.user.xp,
      referralCode: req.user.referral_code
    },
    wallet
  });
});

app.get("/api/tasks", auth, async (req, res) => {
  const completed = await pool.query(
    `SELECT task_id FROM task_completions WHERE user_id=$1`, [req.user.id]
  );
  const done = new Set(completed.rows.map(r => r.task_id));
  res.json({ tasks: TASKS.map(t => ({ ...t, completed: done.has(t.id) })) });
});

app.post("/api/tasks/:id/complete", auth, (_req, res) => {
  // Kept only as an explicit compatibility guard. It must never award client-supplied points.
  res.status(410).json({ error: "LEGACY_ROUTE_DISABLED", message: "Use server verification adapters." });
});

app.post("/api/tasks/:id/start", auth, guarded, async (req, res) => {
  const task = TASKS.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: "TASK_NOT_FOUND" });

  // Supported modes that require an attempt token
  const needsAttempt = task.mode === "link_visit" || task.mode === "telegram_member";
  if (!needsAttempt) {
    return res.status(400).json({ error: "ACTION_START_NOT_REQUIRED", mode: task.mode });
  }

  try {
    const done = await pool.query(
      `SELECT 1 FROM task_completions WHERE user_id=$1 AND task_id=$2`,
      [req.user.id, task.id]
    );
    if (done.rowCount) return res.status(409).json({ error: "TASK_ALREADY_COMPLETED" });

    const attempt = await createActionAttempt(req.user.id, "task", task.id, {
      minSeconds: task.minSeconds
    });

    res.json({
      ok: true,
      taskId: task.id,
      url: task.url,
      mode: task.mode,
      attempt,
      hint:
        task.mode === "telegram_member"
          ? "Join the channel, then wait the required time and press verify. Membership is checked by the server."
          : "Open the link, wait the required time, then verify."
    });
  } catch (e) {
    if (e.code === "TOO_MANY_ATTEMPTS" || e.message === "TOO_MANY_ATTEMPTS") {
      return res.status(429).json({ error: "TOO_MANY_ATTEMPTS", message: "Too many attempts for this task today." });
    }
    console.error("TASK_START_FAILED", req.requestId, e);
    res.status(500).json({ error: "TASK_START_FAILED" });
  }
});

app.post("/api/tasks/:id/verify", auth, guarded, async (req, res) => {
  const task = TASKS.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: "TASK_NOT_FOUND" });

  try {
    const result = await tx(async (client) => {
      // Unified verification (telegram_member | link_visit | ...)
      const verification = await verifyTaskAction({
        task,
        user: req.user,
        attemptToken: req.body?.attemptToken,
        client
      });

      const inserted = await client.query(
        `INSERT INTO task_completions(user_id, task_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, task_id) DO NOTHING
         RETURNING id`,
        [req.user.id, task.id]
      );
      if (!inserted.rowCount) throw Object.assign(new Error("TASK_ALREADY_COMPLETED"), { code: "TASK_ALREADY_COMPLETED" });

      const reference = `task:${req.user.id}:${task.id}`;
      await client.query(
        `INSERT INTO points_ledger(user_id, amount, reason, reference_id)
         VALUES ($1, $2, 'task_completion', $3)`,
        [req.user.id, task.reward, reference]
      );
      await client.query(
        `UPDATE users SET points = points + $1, xp = xp + $1, updated_at = NOW() WHERE id = $2`,
        [task.reward, req.user.id]
      );

      // Qualify referral on first completed task
      const referral = await client.query(
        `SELECT id, referrer_user_id FROM referrals
          WHERE referred_user_id = $1 AND qualified = false
          FOR UPDATE`,
        [req.user.id]
      );
      if (referral.rowCount) {
        await client.query(`UPDATE referrals SET qualified = true WHERE id = $1`, [referral.rows[0].id]);
        await client.query(
          `INSERT INTO audit_logs(user_id, action, metadata)
           VALUES ($1, 'referral_qualified', $2)`,
          [
            req.user.id,
            JSON.stringify({
              referrerUserId: referral.rows[0].referrer_user_id,
              qualification: "first_task_completed"
            })
          ]
        );
        await awardReferralMilestone(client, referral.rows[0].referrer_user_id);
      }

      const q = await client.query(`SELECT points, xp FROM users WHERE id = $1`, [req.user.id]);
      return { user: q.rows[0], verification };
    });

    await audit(req.user.id, "task_completed", {
      taskId: task.id,
      reward: task.reward,
      mode: task.mode,
      method: result.verification?.method,
      status: result.verification?.status
    });

    res.json({
      ok: true,
      taskId: task.id,
      reward: task.reward,
      user: result.user,
      verification: result.verification
    });
  } catch (e) {
    const code = e.code || e.message;
    if (code === "TASK_ALREADY_COMPLETED") {
      return res.status(409).json({ error: "TASK_ALREADY_COMPLETED" });
    }
    if (
      [
        "ACTION_ATTEMPT_REQUIRED",
        "ACTION_ATTEMPT_INVALID",
        "ACTION_ATTEMPT_USED",
        "ACTION_ATTEMPT_EXPIRED",
        "ACTION_TOO_FAST",
        "NOT_A_MEMBER",
        "TELEGRAM_MEMBERSHIP_FAILED",
        "TASK_MISCONFIGURED",
        "VERIFICATION_NOT_CONFIGURED",
        "TOO_MANY_ATTEMPTS"
      ].includes(code)
    ) {
      return res.status(400).json({
        error: code,
        message: e.message,
        meta: e.meta || undefined
      });
    }
    console.error("TASK_VERIFICATION_FAILED", req.requestId, e);
    res.status(400).json({ error: "TASK_VERIFICATION_FAILED" });
  }
});

const DAILY_CHALLENGES = [
  { id: "daily_checkin", platform: "ANGELA", title: "Daily Angel Check-in", reward: 250, mode: "checkin", verification: "server_checkin" },
  { id: "daily_tg_visit", platform: "TELEGRAM", title: "Visit ANGELA Community", reward: 100, url: "https://t.me/angelaCommunity", mode: "link_visit", verification: "link_visit" },
  { id: "daily_x_visit", platform: "X", title: "Visit ANGELA on X", reward: 100, url: "https://x.com/Angelaxai", mode: "link_visit", verification: "link_visit" },
  { id: "daily_yt_visit", platform: "YOUTUBE", title: "Visit ANGELA on YouTube", reward: 100, url: "https://youtube.com/@angelaxai", mode: "link_visit", verification: "link_visit" }
];

async function awardPoints(userId, amount, reason, referenceId, client = pool) {
  const n = BigInt(amount);
  if (n <= 0n) throw new Error("INVALID_REWARD");
  await client.query(`INSERT INTO points_ledger(user_id,amount,reason,reference_id) VALUES($1,$2,$3,$4)`, [userId, n.toString(), reason, referenceId]);
  await client.query(`UPDATE users SET points=points+$1,xp=xp+$1,updated_at=NOW() WHERE id=$2`, [n.toString(), userId]);
}

app.get("/api/daily-challenges", auth, async (req, res) => {
  const q = await pool.query(`SELECT challenge_id FROM daily_completions WHERE user_id=$1 AND challenge_date=CURRENT_DATE`, [req.user.id]);
  const done = new Set(q.rows.map(r => r.challenge_id));
  res.json({ date: new Date().toISOString().slice(0,10), challenges: DAILY_CHALLENGES.map(x => ({ ...x, completed: done.has(x.id) })) });
});

app.post("/api/daily-challenges/:id/start", auth, guarded, async (req, res) => {
  const challenge = DAILY_CHALLENGES.find(x => x.id === req.params.id);
  if (!challenge) return res.status(404).json({ error: "CHALLENGE_NOT_FOUND" });
  if (challenge.mode !== "link_visit") return res.status(400).json({ error: "ACTION_START_NOT_REQUIRED" });
  try {
    const done = await pool.query(
      `SELECT 1 FROM daily_completions
        WHERE user_id=$1 AND challenge_id=$2 AND challenge_date=CURRENT_DATE`,
      [req.user.id, challenge.id]
    );
    if (done.rowCount) return res.status(409).json({ error: "DAILY_ALREADY_COMPLETED" });
    const attempt = await createActionAttempt(req.user.id, "daily", challenge.id, {
      minSeconds: challenge.minSeconds || 10
    });
    res.json({ ok: true, challengeId: challenge.id, url: challenge.url, attempt });
  } catch (e) {
    if (e.code === "TOO_MANY_ATTEMPTS" || e.message === "TOO_MANY_ATTEMPTS") {
      return res.status(429).json({ error: "TOO_MANY_ATTEMPTS" });
    }
    res.status(500).json({ error: "DAILY_START_FAILED" });
  }
});

app.post("/api/daily-challenges/:id/verify", auth, guarded, async (req, res) => {
  const challenge = DAILY_CHALLENGES.find(x => x.id === req.params.id);
  if (!challenge) return res.status(404).json({ error: "CHALLENGE_NOT_FOUND" });
  if (challenge.mode === "link_visit") {
    try {
      const result = await tx(async client => {
        await consumeActionAttempt(client, req.user.id, "daily", challenge.id, req.body?.attemptToken);
        const inserted = await client.query(
          `INSERT INTO daily_completions(user_id,challenge_id,challenge_date) VALUES($1,$2,CURRENT_DATE) ON CONFLICT DO NOTHING RETURNING id`,
          [req.user.id, challenge.id]
        );
        if (!inserted.rowCount) throw new Error("DAILY_ALREADY_COMPLETED");
        const reference = `daily:${req.user.id}:${challenge.id}:${new Date().toISOString().slice(0,10)}`;
        await client.query(`INSERT INTO points_ledger(user_id,amount,reason,reference_id) VALUES($1,$2,'daily_challenge',$3)`, [req.user.id, challenge.reward, reference]);
        await client.query(`UPDATE users SET points=points+$1,xp=xp+$1,updated_at=NOW() WHERE id=$2`, [challenge.reward, req.user.id]);
        return client.query(`SELECT points,xp FROM users WHERE id=$1`, [req.user.id]);
      });
      await audit(req.user.id, "daily_link_visit_completed", { challengeId: challenge.id, reward: challenge.reward });
      return res.json({ ok: true, challengeId: challenge.id, reward: challenge.reward, user: result.rows[0] });
    } catch (e) {
      return res.status(e.message === "DAILY_ALREADY_COMPLETED" ? 409 : 400).json({ error: e.message || "DAILY_VERIFICATION_FAILED" });
    }
  }
  try {
    const result = await tx(async client => {
      const existing = await client.query(`SELECT 1 FROM daily_completions WHERE user_id=$1 AND challenge_id=$2 AND challenge_date=CURRENT_DATE FOR UPDATE`, [req.user.id, challenge.id]);
      if (existing.rowCount) throw new Error("DAILY_ALREADY_COMPLETED");
      await client.query(`INSERT INTO daily_completions(user_id,challenge_id,challenge_date) VALUES($1,$2,CURRENT_DATE)`, [req.user.id, challenge.id]);
      await awardPoints(req.user.id, challenge.reward, "daily_challenge", `${req.user.id}:${challenge.id}:${new Date().toISOString().slice(0,10)}`, client);
      return client.query(`SELECT points,xp FROM users WHERE id=$1`, [req.user.id]);
    });
    await audit(req.user.id, "daily_challenge_completed", { challengeId: challenge.id, reward: challenge.reward });
    res.json({ ok: true, challengeId: challenge.id, reward: challenge.reward, user: result.rows[0] });
  } catch (e) {
    res.status(400).json({ error: e.message || "DAILY_VERIFICATION_FAILED" });
  }
});

let telegramBotUsername = null;
async function getTelegramBotUsername() {
  if (telegramBotUsername) return telegramBotUsername;
  if (!process.env.TELEGRAM_BOT_TOKEN) return null;
  try {
    const r = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`);
    const data = await r.json();
    if (data?.ok && data?.result?.username) telegramBotUsername = data.result.username;
  } catch {}
  return telegramBotUsername;
}

app.get("/api/referral", auth, async (req, res) => {
  const q = await pool.query(`
    SELECT u.referral_code,
      (SELECT COUNT(*) FROM referrals r WHERE r.referrer_user_id=u.id)::int AS invited,
      (SELECT COUNT(*) FROM referrals r WHERE r.referrer_user_id=u.id AND r.qualified=true)::int AS qualified,
      (SELECT COALESCE(SUM(pl.amount),0) FROM points_ledger pl WHERE pl.user_id=u.id AND pl.reason IN ('referral','referral_milestone'))::bigint AS points
    FROM users u WHERE u.id=$1`, [req.user.id]);
  const row = q.rows[0];
  const bot = await getTelegramBotUsername();
  const link = bot && row?.referral_code ? `https://t.me/${bot}?start=${encodeURIComponent(row.referral_code)}` : null;
  res.json({ code: row?.referral_code || null, link, invited: Number(row?.invited || 0), qualified: Number(row?.qualified || 0), points: Number(row?.points || 0), status: "SERVER_CONTROLLED" });
});

function getWithdrawalLaunchState() {
  const enabled = String(process.env.WITHDRAWALS_ENABLED || "false").toLowerCase() === "true";
  return {
    enabled,
    status: enabled ? "OPEN" : "LOCKED",
    reason: enabled ? "LAUNCH_OPEN" : "PRE_LAUNCH",
    message: enabled ? "Withdrawals are open." : "Withdrawals will open at ANGELA launch."
  };
}

app.get("/api/wallet", auth, async (req, res) => {
  res.json({ ...(await getWalletSnapshot(req.user.id, req.user.points)), withdrawalLaunch: getWithdrawalLaunchState() });
});

app.get("/api/wallet/vesting", auth, async (req, res) => {
  const snapshot = await getWalletSnapshot(req.user.id, req.user.points);
  res.json(snapshot);
});

app.post("/api/wallet/challenge", auth, guarded, async (req, res) => {
  if (String(process.env.WALLET_ENABLED || "false").toLowerCase() !== "true") {
    await audit(req.user.id, "wallet_blocked_prelaunch", { reason: "WALLET_CLOSED" });
    return res.status(423).json({ error: "WALLET_LOCKED", message: "Wallet will open at ANGELA launch." });
  }
  res.status(501).json({ error: "WALLET_PROVIDER_NOT_CONFIGURED", message: "Solana wallet provider is activated only after launch configuration." });
});

app.post("/api/wallet/verify", auth, guarded, async (req, res) => {
  if (String(process.env.WALLET_ENABLED || "false").toLowerCase() !== "true") {
    await audit(req.user.id, "wallet_verification_blocked_prelaunch", { reason: "WALLET_CLOSED" });
    return res.status(423).json({ error: "WALLET_LOCKED", message: "Wallet will open at ANGELA launch." });
  }
  res.status(501).json({ error: "WALLET_PROVIDER_NOT_CONFIGURED", message: "Solana wallet verification will be activated at launch." });
});

app.post("/api/wallet/activate", auth, guarded, async (req, res) => {
  if (String(process.env.WALLET_ENABLED || "false").toLowerCase() !== "true") {
    await audit(req.user.id, "wallet_activation_blocked_prelaunch", { reason: "WALLET_CLOSED" });
    return res.status(423).json({ error: "WALLET_LOCKED", message: "Wallet activation will open at ANGELA launch." });
  }
  res.status(501).json({ error: "WALLET_PROVIDER_NOT_CONFIGURED", message: "Solana wallet activation will be enabled at launch." });
});

app.get("/api/withdrawals", auth, async (req, res) => {
  const q = await pool.query(
    `SELECT id,wallet_address,chain,amount_points,amount_tokens,status,tx_hash,rejection_reason,created_at,processed_at
     FROM withdrawals WHERE user_id=$1 ORDER BY id DESC LIMIT 50`, [req.user.id]
  );
  res.json({ withdrawals: q.rows });
});

app.post("/api/withdrawals", auth, guarded, async (req, res) => {
  try {
    const launch = getWithdrawalLaunchState();
    if (!launch.enabled) {
      await audit(req.user.id, "withdrawal_blocked_prelaunch", { reason: launch.reason });
      return res.status(423).json({ error: "WITHDRAWALS_LOCKED", message: launch.message, withdrawalLaunch: launch });
    }
    const withdrawal = await requestWithdrawal(req.user.id, req.body?.amountPoints);
    await audit(req.user.id, "withdrawal_requested", {
      withdrawalId: withdrawal.id, amountPoints: withdrawal.amount_points, chain: withdrawal.chain
    });
    res.status(201).json({ ok: true, withdrawal });
  } catch (e) {
    res.status(400).json({ error: e.message || "WITHDRAWAL_REQUEST_FAILED" });
  }
});

app.post("/api/admin/auth/login", guarded, async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const q = await pool.query(`SELECT id,email,password_hash,role,is_active,mfa_enabled FROM admin_users WHERE email=$1`, [email]);
    const admin = q.rows[0];
    if (!admin || !admin.is_active || !verifyPassword(password, admin.password_hash)) {
      return res.status(401).json({ error: "ADMIN_INVALID_CREDENTIALS" });
    }
    if (admin.mfa_enabled) {
      const challenge = await createMfaChallenge(admin.id);
      await adminAudit("admin_mfa_challenge_issued", null, { adminId: admin.id, requestId: req.requestId });
      return res.status(202).json({
        ok: false, mfaRequired: true, challenge,
        admin: { id: admin.id, email: admin.email, role: admin.role }
      });
    }
    const token = await createAdminSession(admin.id, false);
    await pool.query(`UPDATE admin_users SET last_login_at=NOW() WHERE id=$1`, [admin.id]);
    await adminAudit("admin_login", null, { adminId: admin.id, requestId: req.requestId, mfa: false });
    res.cookie(ADMIN_COOKIE, token, { httpOnly: true, secure: COOKIE_SECURE, sameSite: COOKIE_SAMESITE, maxAge: 8*86400*1000, path: "/" });
    res.json({ ok: true, admin: { id: admin.id, email: admin.email, role: admin.role, mfaEnabled: false } });
  } catch (e) {
    res.status(500).json({ error: "ADMIN_LOGIN_FAILED" });
  }
});

app.post("/api/admin/auth/mfa/verify", guarded, async (req, res) => {
  try {
    const adminId = Number(req.body?.adminId);
    const challenge = String(req.body?.challenge || "");
    const code = String(req.body?.code || "");
    if (!Number.isInteger(adminId) || !challenge) return res.status(400).json({ error: "MFA_CHALLENGE_INVALID" });
    const ok = await consumeMfaChallenge(challenge, adminId, code);
    if (!ok) {
      await adminAudit("admin_mfa_failed", null, { adminId, requestId: req.requestId });
      return res.status(401).json({ error: "MFA_INVALID_CODE" });
    }
    const token = await createAdminSession(adminId, true);
    const q = await pool.query(`SELECT id,email,role,mfa_enabled FROM admin_users WHERE id=$1 AND is_active=TRUE`, [adminId]);
    if (!q.rowCount) return res.status(401).json({ error: "ADMIN_UNAUTHORIZED" });
    const admin = q.rows[0];
    await pool.query(`UPDATE admin_users SET last_login_at=NOW() WHERE id=$1`, [adminId]);
    await adminAudit("admin_login", null, { adminId, requestId: req.requestId, mfa: true });
    res.cookie(ADMIN_COOKIE, token, { httpOnly: true, secure: COOKIE_SECURE, sameSite: COOKIE_SAMESITE, maxAge: 8*86400*1000, path: "/" });
    res.json({ ok: true, admin });
  } catch {
    res.status(500).json({ error: "MFA_VERIFY_FAILED" });
  }
});

app.post("/api/admin/auth/mfa/enroll", adminAuth, async (req, res) => {
  try {
    if (req.admin.mfa_enabled) return res.status(409).json({ error: "MFA_ALREADY_ENABLED" });
    const secret = await beginMfaEnrollment(req.admin.id);
    const issuer = encodeURIComponent(process.env.MFA_ISSUER || "ANGELA");
    const label = encodeURIComponent(`${req.admin.email}`);
    const otpauth = `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
    await adminAudit("admin_mfa_enrollment_started", null, { adminId: req.admin.id, requestId: req.requestId });
    res.json({ ok: true, secret, otpauth });
  } catch (e) {
    res.status(500).json({ error: e.message || "MFA_ENROLL_FAILED" });
  }
});

app.post("/api/admin/auth/mfa/confirm", adminAuth, guarded, async (req, res) => {
  try {
    const ok = await confirmMfaEnrollment(req.admin.id, req.body?.code);
    if (!ok) return res.status(400).json({ error: "MFA_INVALID_CODE" });
    await adminAudit("admin_mfa_enabled", null, { adminId: req.admin.id, requestId: req.requestId });
    res.json({ ok: true, mfaEnabled: true });
  } catch {
    res.status(500).json({ error: "MFA_CONFIRM_FAILED" });
  }
});

app.post("/api/admin/auth/mfa/disable", adminAuth, requireRole("superadmin"), async (req, res) => {
  try {
    await disableMfa(req.admin.id);
    await adminAudit("admin_mfa_disabled", null, { adminId: req.admin.id, requestId: req.requestId });
    res.json({ ok: true, mfaEnabled: false });
  } catch {
    res.status(500).json({ error: "MFA_DISABLE_FAILED" });
  }
});

app.post("/api/admin/auth/logout", adminAuth, async (req, res) => {
  await revokeAdminSession(req);
  res.clearCookie(ADMIN_COOKIE, { httpOnly: true, secure: COOKIE_SECURE, sameSite: "lax", path: "/" });
  res.json({ ok: true });
});

app.get("/api/admin/auth/me", adminAuth, (req, res) => {
  res.json({ admin: { id: req.admin.id, email: req.admin.email, role: req.admin.role, mfaEnabled: req.admin.mfa_enabled } });
});

app.post("/api/admin/maintenance/cleanup-sessions", adminAuth, requireRole("superadmin"), async (req, res) => {
  try {
    const deleted = await cleanupAdminSessions();
    await adminAudit("admin_session_cleanup", null, { adminId: req.admin.id, deleted, requestId: req.requestId });
    res.json({ ok: true, deleted });
  } catch {
    res.status(500).json({ error: "SESSION_CLEANUP_FAILED" });
  }
});

app.get("/api/admin/withdrawals", adminAuth, requireRole("viewer"), async (req, res) => {
  try { res.json({ withdrawals: await listPendingWithdrawals(req.query.limit) }); }
  catch (e) { res.status(500).json({ error: e.message || "ADMIN_WITHDRAWAL_LIST_FAILED" }); }
});

app.post("/api/admin/withdrawals/:id/approve", adminAuth, requireRole("operator"), async (req, res) => {
  try { const row = await approveWithdrawal(req.params.id); await adminAudit("withdrawal_approved", row.id, { requestId: req.requestId }); res.json({ ok: true, withdrawal: row }); }
  catch (e) { await adminAudit("withdrawal_approve_failed", req.params.id, { requestId: req.requestId, error: e.message }); res.status(400).json({ error: e.message || "WITHDRAWAL_APPROVE_FAILED" }); }
});

app.post("/api/admin/withdrawals/:id/reject", adminAuth, requireRole("operator"), async (req, res) => {
  try { const row = await rejectWithdrawal(req.params.id, req.body?.reason); await adminAudit("withdrawal_rejected", row.id, { requestId: req.requestId }); res.json({ ok: true, withdrawal: row }); }
  catch (e) { await adminAudit("withdrawal_reject_failed", req.params.id, { requestId: req.requestId, error: e.message }); res.status(400).json({ error: e.message || "WITHDRAWAL_REJECT_FAILED" }); }
});

app.post("/api/admin/withdrawals/:id/complete", adminAuth, requireRole("treasury"), async (req, res) => {
  try { const row = await completeWithdrawal(req.params.id, req.body?.txHash); await adminAudit("withdrawal_completed", row.id, { requestId: req.requestId, txHash: row.tx_hash }); res.json({ ok: true, withdrawal: row }); }
  catch (e) { await adminAudit("withdrawal_complete_failed", req.params.id, { requestId: req.requestId, error: e.message }); res.status(400).json({ error: e.message || "WITHDRAWAL_COMPLETE_FAILED" }); }
});

app.get("/api/wallet/rules", auth, (_req, res) => {
  res.json({
    minimumWithdrawalPoints: process.env.MIN_WITHDRAW_POINTS || "1000",
    walletNetwork: "solana",
    walletStatus: "CLOSED",
    tokenStatus: "NOT_CREATED",
    note: "Wallet, token and withdrawals remain closed until ANGELA launch."
  });
});

app.use((req, res) => {
  res.status(404).json({ error: "NOT_FOUND", path: req.path, requestId: req.requestId });
});

app.use((err, req, res, _next) => {
  console.error("ANGELA request error", req.requestId, err);
  if (res.headersSent) return;
  res.status(Number(err?.statusCode || err?.status || 500)).json({ error: "INTERNAL_SERVER_ERROR", requestId: req.requestId });
});

app.listen(PORT, () => console.log(`ANGELA API launch-ready running on ${PORT}`));
