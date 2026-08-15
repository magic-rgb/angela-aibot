CREATE TABLE IF NOT EXISTS action_attempts (
  id BIGSERIAL PRIMARY KEY,
  token_hash TEXT UNIQUE NOT NULL,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('task','daily')),
  action_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_action_attempts_user_action
  ON action_attempts(user_id, action_type, action_id);
CREATE INDEX IF NOT EXISTS idx_action_attempts_expiry
  ON action_attempts(expires_at);

CREATE UNIQUE INDEX IF NOT EXISTS ux_points_ledger_user_reference
  ON points_ledger(user_id, reference_id)
  WHERE reference_id IS NOT NULL;
