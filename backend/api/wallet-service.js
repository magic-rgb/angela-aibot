import { pool } from './db.js';

const LOCK_BPS = [333n, 333n, 334n];

function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d;
}

export function calculateVesting(totalPoints, activatedAt, now = new Date()) {
  const total = BigInt(totalPoints || 0);
  if (!activatedAt) return {
    activated: false,
    totalPoints: total.toString(),
    vestedPoints: '0',
    availablePoints: '0',
    lockedPoints: total.toString(),
    locks: []
  };
  const activation = new Date(activatedAt);
  const current = new Date(now);
  const dates = [activation, addMonths(activation, 1), addMonths(activation, 2)];
  const unlocked = dates.map(d => current >= d);
  let vested = 0n;
  const locks = dates.map((date, i) => {
    const points = (total * LOCK_BPS[i]) / 1000n;
    if (unlocked[i]) vested += points;
    return { id: i + 1, unlockAt: date.toISOString(), unlocked: unlocked[i], bps: LOCK_BPS[i].toString(), points: points.toString() };
  });
  if (unlocked[2]) vested = total;
  return {
    activated: true,
    activatedAt: activation.toISOString(),
    totalPoints: total.toString(),
    vestedPoints: vested.toString(),
    availablePoints: vested.toString(),
    lockedPoints: (total - vested).toString(),
    locks
  };
}

export async function getWalletForUser(userId) {
  const { rows } = await pool.query(
    `SELECT id,user_id,address,chain,verified_at,created_at FROM wallets WHERE user_id=$1`, [userId]
  );
  return rows[0] || null;
}

export async function getWalletSnapshot(userId, points) {
  const vesting = await pool.query(
    `SELECT activated_at,lock1_unlocked_at,lock2_unlocked_at,lock3_unlocked_at FROM vesting_schedules WHERE user_id=$1`, [userId]
  );
  const calc = calculateVesting(points, vesting.rows[0]?.activated_at);
  const reserved = await pool.query(
    `SELECT COALESCE(SUM(amount_points),0)::text AS points
       FROM withdrawals
      WHERE user_id=$1 AND status IN ('pending','processing','completed')`, [userId]
  );
  const reservedPoints = BigInt(reserved.rows[0]?.points || 0);
  const available = BigInt(calc.availablePoints) > reservedPoints
    ? (BigInt(calc.availablePoints) - reservedPoints).toString() : '0';
  return {
    wallet: null,
    vesting: calc,
    withdrawal: {
      minimumPoints: process.env.MIN_WITHDRAW_POINTS || '1000',
      availablePoints: available,
      hasPending: reservedPoints > 0n
    },
    launch: {
      walletEnabled: String(process.env.WALLET_ENABLED || 'false').toLowerCase() === 'true',
      withdrawalsEnabled: String(process.env.WITHDRAWALS_ENABLED || 'false').toLowerCase() === 'true',
      status: 'PRE_LAUNCH',
      message: 'Wallet and withdrawals will open at ANGELA launch.'
    },
    token: {
      status: 'NOT_CREATED',
      mintAddress: null,
      network: null,
      program: null,
      decimals: null
    },
    rules: {
      pointsAreServerAuthoritative: true,
      walletNetwork: 'solana',
      note: 'No token or treasury exists before launch; no on-chain settlement is available yet.'
    }
  };
}

export async function createWalletChallenge() {
  throw new Error('WALLET_LOCKED_PRE_LAUNCH');
}

export async function verifyWalletSignature() {
  throw new Error('WALLET_LOCKED_PRE_LAUNCH');
}

export async function requestWithdrawal() {
  throw new Error('WITHDRAWALS_LOCKED');
}
