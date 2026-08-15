-- ANGELA v16: wallet signature verification + withdrawal state
CREATE TABLE IF NOT EXISTS wallet_challenges (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  chain TEXT NOT NULL,
  nonce TEXT NOT NULL,
  message TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wallet_challenges_user ON wallet_challenges(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_challenges_expiry ON wallet_challenges(expires_at);

ALTER TABLE wallets ALTER COLUMN verified_at DROP DEFAULT;

CREATE TABLE IF NOT EXISTS withdrawals (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  chain TEXT NOT NULL,
  amount_points BIGINT NOT NULL CHECK (amount_points > 0),
  amount_tokens NUMERIC(38,18) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','rejected','cancelled')),
  tx_hash TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_status ON withdrawals(user_id,status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created ON withdrawals(created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);

-- Remove the insecure client-controlled reward path before enabling the v16 API.
