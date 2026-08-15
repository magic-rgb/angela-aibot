CREATE TABLE IF NOT EXISTS admin_mfa_challenges (
  id BIGSERIAL PRIMARY KEY,
  admin_user_id BIGINT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  challenge_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_mfa_challenges_expiry ON admin_mfa_challenges(expires_at);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_last_seen ON admin_sessions(last_seen_at);

ALTER TABLE admin_sessions ADD COLUMN IF NOT EXISTS mfa_verified_at TIMESTAMPTZ;
