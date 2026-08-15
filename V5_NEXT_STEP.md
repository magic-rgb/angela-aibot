# V5 — Production Backend Foundation

The frontend must not be trusted for rewards, verification, referrals, vesting, or withdrawals.

Recommended implementation order:
1. Telegram initData authentication
2. PostgreSQL + users/tasks/ledger
3. Server-side task verification
4. Daily challenge scheduler/reset
5. Referral qualification
6. Wallet activation + vesting
7. Withdrawal service
8. Admin dashboard
9. Rate limits, audit logs, monitoring

Platform limitations:
- X, YouTube, and Telegram actions may require platform-specific APIs/permissions; do not claim a task is verified merely because a link was opened.
