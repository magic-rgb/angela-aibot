CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  telegram_user_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  points BIGINT NOT NULL DEFAULT 0,
  xp BIGINT NOT NULL DEFAULT 0,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS points_ledger (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  amount BIGINT NOT NULL,
  reason TEXT NOT NULL,
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_completions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  task_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, task_id)
);

CREATE TABLE IF NOT EXISTS daily_completions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  challenge_id TEXT NOT NULL,
  challenge_date DATE NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, challenge_id, challenge_date)
);

CREATE TABLE IF NOT EXISTS vesting_schedules (
  user_id BIGINT PRIMARY KEY REFERENCES users(id),
  activated_at TIMESTAMPTZ,
  lock1_unlocked_at TIMESTAMPTZ,
  lock2_unlocked_at TIMESTAMPTZ,
  lock3_unlocked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ledger_user ON points_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_user_date ON daily_completions(user_id, challenge_date);
