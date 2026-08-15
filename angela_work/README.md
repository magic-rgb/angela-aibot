# ANGELA Community Mini App v2

A frontend-first Telegram Mini App prototype for the ANGELA community ecosystem.

## Added in v2
- Telegram Mini App SDK detection and automatic `ready()` / `expand()` setup.
- Dynamic Telegram first name when available.
- Persistent local state instead of scattered task flags.
- Mission tabs: Primary / Secondary / Completed.
- Mission verification animation/state and point accounting.
- Daily Angel Check-in with streak indicator.
- Dynamic Points, XP, level progress and reward estimates.
- Referral-link copy interaction.
- Wallet withdrawal UX now clearly separates frontend from backend eligibility.
- Toast notifications instead of browser alerts.
- Stronger product hierarchy and reduced visual noise.

## Important
This build is **pre-launch production mode**. Task rewards, daily rewards, referral state and balances are server-authoritative. Pre-launch external missions use link-visit claims; real social-action verification requires optional production API integrations. Wallet and withdrawals remain closed until launch.

## Next production layer
1. Telegram `initData` validation on the server.
2. User database + signed sessions.
3. Mission provider verification APIs.
4. Points ledger with idempotency and anti-abuse rules.
5. Referral attribution and fraud protection.
6. Reward/Vesting service.
7. ANGELA Wallet connection and withdrawal service.
8. Admin dashboard and audit logs.
