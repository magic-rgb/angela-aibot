# ANGELA — MASTER HANDOFF / CONTEXT FOR NEW CHAT

Project: ANGELA Web3 Community / Telegram Mini App
Current version: v16
This ZIP is the complete accumulated project through v15.

## 1. Project purpose
ANGELA is a Web3 community Mini App focused on Tasks, Points/XP, Daily Challenges, Referrals, Wallet/Vesting and eventually Withdrawals.

The project should evolve from a frontend/demo into a secure production application. The browser must NEVER be authoritative for points, task verification, referral qualification, vesting, balances or withdrawals.

## 2. Current task structure

PRIMARY TASKS
- Telegram — Join ANGELA Community
  https://t.me/angelaCommunity
- X — Follow ANGELA
  https://x.com/Angelaxai
- Discord — Join ANGELA Discord
  https://discord.gg/CSqtGeq6r
- YouTube — Subscribe to ANGELA
  https://youtube.com/@angelaxai

SECONDARY TASKS
- Alexa Rodriguez — UI/UX
  https://x.com/Alexauiux
- CEO — Ameli
  https://x.com/ameliui
- CTO — Elena
  https://x.com/Elenacto

DAILY CHALLENGES
Telegram:
- Like/react to posts
- Comment on posts

X:
- Like posts
- Comment/reply under posts

YouTube:
- Like new video
- Comment on new video

Important: opening a link is NOT proof of completion. Real verification must happen server-side through permitted platform APIs/permissions or another legitimate verification method.

## 3. Wallet / vesting rule

Wallet is currently described as:
- Wallet UI initially shows “Coming Soon”.
- After wallet activation, Lock 1 is unlocked immediately and withdrawal becomes eligible according to the project's final withdrawal rules.
- Lock 2 unlocks at the end of Month 1.
- Lock 3 unlocks at the end of Month 2.

Current v15 server-side calculator uses:
- Lock 1 = activation time
- Lock 2 = activation + 1 month
- Lock 3 = activation + 2 months

The frontend must never be able to unlock these locks by itself.

## 4. Versions completed

v3 — Tasks
- Real primary/secondary task links
- Daily challenge structure
- Task UI flow foundation

v4 — Referral + Vesting foundation
- Referral state
- Daily reset
- Three-lock vesting demo foundation

v5 — Backend Blueprint
- Database model
- API contract
- Points ledger concept
- Referral/vesting/withdrawal model

v6 — Admin Console Foundation
- Task management UI
- Daily challenge management UI
- Vesting overview
- Security notes

v7 — API Scaffold
- Express API scaffold
- Health endpoint
- Tasks
- Daily challenges
- Verification/wallet/withdrawal endpoint placeholders

v8 — Authentication + Database Foundation
- PostgreSQL schema
- Telegram initData HMAC verification helper
- Server-side data model

v9 — Sessions + Atomic Points Ledger
- Server sessions
- Duplicate reward protection
- Atomic reward/ledger blueprint

v10 — Production API Route Contract
- Auth
- Profile
- Tasks
- Daily
- Referral
- Wallet/Vesting route contract

v11 — PostgreSQL + Telegram Authentication
- PostgreSQL Pool
- Transaction helper
- Secure opaque session cookie
- Telegram auth route
- /api/me
- One-time task reward transaction

v12 — Daily Challenges + Referral
- Date-scoped daily challenges
- One reward per user/challenge/day
- Referral qualification foundation
- Self-referral protection

v13 — Frontend API Bridge
- Frontend bridge for auth/profile/tasks/daily/referral

v14 — Live Data UI Layer
- Frontend helpers to load server-driven profile, tasks, daily challenges and referral data

v15 — Verification + Wallet/Vesting
- Server-side verification adapter contract
- Wallet database model
- Server-side vesting calculator
- Frontend wallet/vesting API bridge

## 5. Important security requirements

Never:
- Trust localStorage for points.
- Trust a client-provided reward amount.
- Trust client-provided “verified=true”.
- Allow frontend to unlock vesting.
- Allow frontend to create qualified referrals.
- Process withdrawals based only on frontend state.

Production must include:
- Telegram initData verification
- Authenticated server sessions
- PostgreSQL
- Atomic points ledger
- Unique reward references
- Rate limiting
- Audit logs
- Admin authentication and roles
- Wallet ownership/signature verification
- Server-side withdrawal eligibility calculation
- Platform-specific verification adapters where legally/technically available

## 6. Current limitations

This v15 ZIP is a cumulative development package and NOT a claim that a production backend is deployed.

Still required:
1. Configure a real PostgreSQL database.
2. Configure TELEGRAM_BOT_TOKEN.
3. Run migrations.
4. Deploy backend over HTTPS.
5. Connect frontend API base URL.
6. Implement real platform verification adapters.
7. Implement wallet signature challenge/verification.
8. Implement withdrawal service and final withdrawal policy.
9. Connect Admin Console to authenticated backend endpoints.
10. Perform end-to-end security/testing.

## 7. Recommended next development order

NEXT STEP A:
Wallet signature verification.

NEXT STEP B:
Withdrawal rules and server-side withdrawal eligibility.

NEXT STEP C:
Connect Wallet page to real API.

NEXT STEP D:
Admin authentication + Admin API.

NEXT STEP E:
Real platform verification adapters.

NEXT STEP F:
Production deployment, monitoring and security audit.

## 8. Design direction

ANGELA UI should remain consistent with the established visual identity:
- premium / futuristic Web3
- dark base
- controlled space-purple accents
- purple should be an accent, NOT a page-wide purple wash
- clean hierarchy
- depth and premium feel
- avoid unnecessary redesign of the established ANGELA visual identity

## 9. New-chat instruction

When continuing this project in a new chat:
- Treat this ZIP and this document as the source of truth.
- Do not restart the project from zero.
- Do not remove existing functionality without a reason.
- Continue from v15.
- Before calling something “production-ready”, verify it technically.
- Clearly distinguish between implemented code, blueprint code, and external integrations that still require credentials/APIs/deployment.


## 10. v16 implementation status

Implemented:
- EVM wallet signature challenge/verification using `ethers`.
- One-time expiring wallet challenges.
- Server-side wallet binding and activation.
- Server-side vesting calculation for Lock 1/2/3.
- Withdrawal request endpoint with minimum amount and pending reservation.
- Withdrawal database table and audit log table.
- Wallet page connected to backend wallet/vesting data.
- Legacy client-controlled task reward endpoint disabled.
- Basic API rate limiting for sensitive endpoints.

Still not production-complete:
- On-chain treasury payout processor.
- Real external verification adapters for Telegram/X/Discord/YouTube.
- Admin authentication/authorization.
- Distributed rate limiting and broader abuse prevention.
- Full migration/version tracking framework.
