# ANGELA v9 — Sessions + Atomic Points Ledger

Foundation added for the next production step:
- opaque server sessions
- session database schema
- atomic reward/ledger transaction blueprint
- duplicate-reward protection using unique reference IDs
- one-time task completion model

Deployment sequence:
1. Configure PostgreSQL.
2. Run schema migrations.
3. Implement session creation after verified Telegram initData.
4. Add authenticated middleware to `/api/*`.
5. Implement transactional task completion and daily rewards.
6. Add audit logs and rate limiting.
7. Connect Admin Console to authenticated `/api/admin/*`.

Do not deploy the placeholder service functions as if they were complete. They intentionally fail until connected to a real database driver.
