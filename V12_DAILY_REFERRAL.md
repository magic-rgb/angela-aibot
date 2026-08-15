# ANGELA v12 — Daily Challenges + Referral Foundation

Added:
- Database table for date-scoped daily challenges.
- Server-side daily completion with one reward per user/challenge/day.
- Points ledger integration for daily rewards.
- Referral qualification model with self-referral protection.

Important:
- `verified` must come from a real platform verification adapter; the browser must never be allowed to set it to true.
- Referral rewards should be awarded only after the project's chosen qualification rule is met.
- Daily challenges should be created/managed through the Admin API.
