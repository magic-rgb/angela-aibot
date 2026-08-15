# ANGELA MiniApp Backend Blueprint

This folder defines the production backend contract for:
- Telegram Mini App authentication
- user profiles
- primary/secondary tasks
- daily challenges
- referral qualification
- points ledger
- three-stage vesting
- withdrawal eligibility

The current MiniApp remains frontend/demo-only until these endpoints are deployed.

## Security
Never trust points, task completion, referral qualification, token balances, or vesting state sent by the browser. The backend must calculate and persist them.

## Suggested stack
Node.js + TypeScript + PostgreSQL + Redis (optional for rate limiting/queues).

## Core tables
users, tasks, task_completions, daily_challenges, points_ledger, referrals, wallets, vesting_schedules, withdrawals
