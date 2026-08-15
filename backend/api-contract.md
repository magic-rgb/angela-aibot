# API Contract

POST /api/auth/telegram
- Verify Telegram Mini App initData server-side.
- Return a short-lived application session.

GET /api/me
- Return profile, points, XP, referral code, and wallet/vesting status.

GET /api/tasks
- Return active primary and secondary tasks.

POST /api/tasks/:id/start
- Record task attempt/rate-limit metadata.

POST /api/tasks/:id/verify
- Server verifies the completion where the platform/API permits.
- On success, append exactly one points_ledger entry.

GET /api/daily-challenges
- Return today's challenges and completion state.

POST /api/daily-challenges/:id/verify
- Verify and award once per user/day.

GET /api/referral
- Return referral code and qualified counts.

POST /api/referral/qualify
- Server-side qualification only; never trust a client flag.

POST /api/wallet/activate
- Bind wallet after validation and unlock Lock 1.

GET /api/wallet/vesting
- Calculate current unlock status from server timestamps.

POST /api/withdrawals
- Validate available balance, vesting, destination, and anti-abuse rules before creating a withdrawal.
