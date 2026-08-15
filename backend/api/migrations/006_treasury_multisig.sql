-- ANGELA v23: Treasury / Multisig execution architecture.
-- No private keys are stored by ANGELA. These records describe execution requests only.
CREATE TABLE IF NOT EXISTS treasury_accounts (
  id BIGSERIAL PRIMARY KEY,
  chain TEXT NOT NULL,
  treasury_address TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'erc20' CHECK (asset_type IN ('native','erc20')),
  token_contract TEXT,
  decimals INTEGER NOT NULL DEFAULT 18 CHECK (decimals BETWEEN 0 AND 36),
  execution_mode TEXT NOT NULL DEFAULT 'multisig' CHECK (execution_mode IN ('multisig','manual')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(chain, treasury_address, asset_type, token_contract)
);

CREATE TABLE IF NOT EXISTS treasury_jobs (
  id BIGSERIAL PRIMARY KEY,
  withdrawal_id BIGINT NOT NULL UNIQUE REFERENCES withdrawals(id) ON DELETE RESTRICT,
  treasury_account_id BIGINT NOT NULL REFERENCES treasury_accounts(id) ON DELETE RESTRICT,
  recipient_address TEXT NOT NULL,
  amount_tokens NUMERIC(38,18) NOT NULL CHECK (amount_tokens > 0),
  chain TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('native','erc20')),
  token_contract TEXT,
  calldata TEXT,
  value_wei TEXT,
  status TEXT NOT NULL DEFAULT 'prepared' CHECK (status IN ('prepared','submitted','broadcasted','failed','cancelled')),
  external_reference TEXT,
  tx_hash TEXT,
  error_message TEXT,
  created_by_admin_id BIGINT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  broadcasted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tx_hash) DEFERRABLE INITIALLY IMMEDIATE
);

CREATE INDEX IF NOT EXISTS idx_treasury_jobs_status_created ON treasury_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_treasury_jobs_withdrawal ON treasury_jobs(withdrawal_id);
