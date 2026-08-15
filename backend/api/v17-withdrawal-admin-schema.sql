-- ANGELA v17: withdrawal accounting/indexes and admin processing support.
-- v16 must already be applied before this migration.
CREATE INDEX IF NOT EXISTS idx_withdrawals_open_user
  ON withdrawals(user_id, status)
  WHERE status IN ('pending','processing','completed');

CREATE INDEX IF NOT EXISTS idx_withdrawals_processing
  ON withdrawals(status, created_at)
  WHERE status IN ('pending','processing');

ALTER TABLE withdrawals
  ADD CONSTRAINT withdrawals_tx_hash_format
  CHECK (tx_hash IS NULL OR tx_hash ~ '^[1-9A-HJ-NP-Za-km-z]{32,88}$');

-- Prevent duplicate settlement records for the same on-chain transaction.
CREATE UNIQUE INDEX IF NOT EXISTS uq_withdrawals_tx_hash
  ON withdrawals(tx_hash)
  WHERE tx_hash IS NOT NULL;
