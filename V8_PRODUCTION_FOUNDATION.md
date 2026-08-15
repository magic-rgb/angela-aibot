# ANGELA v8 — Authentication + Database Foundation

Added:
- PostgreSQL schema for users, points ledger, task completions, daily completions and vesting.
- Telegram Mini App initData HMAC verification helper.
- Server-side data model for points instead of trusting localStorage.

Still required before production:
- PostgreSQL connection layer and migrations.
- Session/JWT handling after Telegram authentication.
- Rate limiting and audit logs.
- Actual Telegram/X/YouTube verification integrations where permitted.
- Admin authentication and role-based access.
- Wallet ownership validation and withdrawal processor.

Security rule:
The browser must never be authoritative for points, task completion, referral qualification, vesting, or withdrawals.
