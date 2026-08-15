# ANGELA Launch Audit — Pre-Launch

## Result

The build is **pre-launch ready for community points/tasks**, with Wallet and Withdrawals intentionally locked.

## Verified in this audit

- Telegram Mini App bootstrap and Telegram init-data authentication path exist.
- Primary and secondary task links are wired to server task records.
- Task rewards are issued only by the backend and recorded in `points_ledger`.
- Duplicate task claims are rejected by the database uniqueness rule.
- Daily check-in is server-authoritative and once per day.
- Daily link-visit challenges are server-authoritative and once per day.
- Referral attribution uses Telegram `start_param` when a valid referral code is present.
- Referral qualification occurs after the referred user completes their first task.
- Referral counters and referral points ledger are read from PostgreSQL.
- Wallet endpoints remain locked until `WALLET_ENABLED=true`.
- Withdrawal endpoint remains locked until `WITHDRAWALS_ENABLED=true`.
- Admin login supports the MFA challenge flow.
- Admin RBAC remains server-enforced.
- Admin withdrawal actions require authenticated admin sessions and role permissions.
- JavaScript syntax checks pass.
- Launch check passes with Wallet and Withdrawals closed.

## External destination audit

The configured destinations are:

- Telegram: `https://t.me/angelaCommunity`
- X: `https://x.com/Angelaxai`
- Discord: `https://discord.gg/CSqtGeq6r`
- YouTube: `https://youtube.com/@angelaxai`
- Alexa UI/UX: `https://x.com/Alexauiux`
- CEO: `https://x.com/ameliui`
- CTO: `https://x.com/Elenacto`

The Telegram destination was reachable during the external audit. X destinations resolved as live pages. Discord redirects through its invite flow. YouTube fetches can be throttled by automated clients, so the final human/browser click test remains required.

## Important product rule

Pre-launch task rewards currently use **link-visit missions**. The server records the claim and awards the fixed reward; the browser never supplies the reward amount.

This is intentionally different from claiming that a social follow/join was verified. Real X/Discord/YouTube action verification requires the corresponding production API credentials and permissions and is not faked.

## Launch locks

- `WALLET_ENABLED=false`
- `WITHDRAWALS_ENABLED=false`
- Token: not created / not hard-coded
- Treasury: not configured / not hard-coded
- Multisig: not configured / not hard-coded

## Final production checks before opening the app

1. Set real `DATABASE_URL`.
2. Set real `TELEGRAM_BOT_TOKEN`.
3. Set the production `FRONTEND_ORIGIN`.
4. Set a real `MFA_ENCRYPTION_KEY`.
5. Run `npm run migrate`.
6. Run `npm run check:launch`.
7. Open the Mini App from Telegram and perform one complete task + daily check-in test with a real test account.
8. Confirm the points ledger and user balance changed exactly once for each test.
