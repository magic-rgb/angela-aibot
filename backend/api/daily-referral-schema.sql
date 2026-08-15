CREATE TABLE IF NOT EXISTS daily_challenges (
  id BIGSERIAL PRIMARY KEY,
  platform TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  reward_points INTEGER NOT NULL CHECK (reward_points > 0),
  challenge_date DATE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_daily_challenges_date
ON daily_challenges(challenge_date);

CREATE TABLE IF NOT EXISTS referrals (
  id BIGSERIAL PRIMARY KEY,
  referrer_user_id BIGINT NOT NULL REFERENCES users(id),
  referred_user_id BIGINT UNIQUE NOT NULL REFERENCES users(id),
  qualified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
