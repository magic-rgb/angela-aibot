import { pool, tx } from './db.js';
import { getWalletSnapshot } from './wallet-service.js';

function requirePositiveId(value) {
  const id = String(value || '');
  if (!/^\d+$/.test(id)) throw new Error('INVALID_WITHDRAWAL_ID');
  return id;
}

export async function listPendingWithdrawals(limit = 100) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 250);
  const q = await pool.query(
    `SELECT w.id,w.user_id,w.wallet_address,w.chain,w.amount_points,w.amount_tokens,
            w.status,w.tx_hash,w.rejection_reason,w.created_at,w.processed_at,
            u.telegram_user_id,u.username
       FROM withdrawals w
       JOIN users u ON u.id=w.user_id
      WHERE w.status IN ('pending','processing')
      ORDER BY w.created_at ASC
      LIMIT $1`, [safeLimit]
  );
  return q.rows;
}

export async function approveWithdrawal(id) {
  const withdrawalId = requirePositiveId(id);
  return tx(async client => {
    const q = await client.query(
      `UPDATE withdrawals
          SET status='processing'
        WHERE id=$1 AND status='pending'
      RETURNING *`, [withdrawalId]
    );
    if (!q.rowCount) throw new Error('WITHDRAWAL_NOT_PENDING');
    return q.rows[0];
  });
}

export async function rejectWithdrawal(id, reason) {
  const withdrawalId = requirePositiveId(id);
  const cleanReason = String(reason || 'Rejected by admin').slice(0, 500);
  return tx(async client => {
    const q = await client.query(
      `UPDATE withdrawals
          SET status='rejected', rejection_reason=$2, processed_at=NOW()
        WHERE id=$1 AND status IN ('pending','processing')
      RETURNING *`, [withdrawalId, cleanReason]
    );
    if (!q.rowCount) throw new Error('WITHDRAWAL_NOT_OPEN');
    return q.rows[0];
  });
}

export async function completeWithdrawal(id, txHash) {
  const withdrawalId = requirePositiveId(id);
  const hash = String(txHash || '').trim();
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,88}$/.test(hash)) throw new Error('INVALID_SOLANA_TX_SIGNATURE');
  return tx(async client => {
    const q = await client.query(
      `UPDATE withdrawals
          SET status='completed', tx_hash=$2, processed_at=NOW()
        WHERE id=$1 AND status='processing'
      RETURNING *`, [withdrawalId, hash]
    );
    if (!q.rowCount) throw new Error('WITHDRAWAL_NOT_PROCESSING');
    return q.rows[0];
  });
}

export async function getWithdrawalForUser(id, userId) {
  const q = await pool.query(
    `SELECT * FROM withdrawals WHERE id=$1 AND user_id=$2`, [id, userId]
  );
  return q.rows[0] || null;
}
