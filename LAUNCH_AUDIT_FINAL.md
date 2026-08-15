# ANGELA Launch Final Audit

## Scope
This build keeps the v24 structure and fixes functional gaps required for community launch.

## Fixed
- Task rewards now require a server-issued, single-use attempt token.
- Daily link rewards now require a server-issued, single-use attempt token.
- Attempt tokens expire after 5 minutes and require an 8-second minimum elapsed time.
- Direct reward API calls without an attempt are rejected.
- Referral codes for new users use the full Telegram user ID to avoid the previous last-8-digit collision risk.
- Referral milestone: 3 qualified referrals awards 2,500 points once, server-side, with a ledger reference.
- Referral dashboard includes both referral and milestone points.
- Telegram start parameter is read from verified initData, not trusted from the client request body.
- Menu opens functional quick navigation to Profile/Core/Missions/Community/Reward Vault.
- Notifications display real Daily/Referral state instead of being a decorative button.
- Server has JSON 404 and final error handling with request IDs.
- Wallet, token and withdrawals remain intentionally locked pre-launch.

## Verification performed in this environment
- All backend JavaScript files pass `node --check`.
- Frontend JavaScript passes `node --check`.
- Original v24 ZIP integrity verified before modification.
- Final source audit confirms attempt routes, reward guards, referral milestone, verified start_param handling, and locked withdrawal state.

## External runtime requirements
The final application still needs the deployment environment's real PostgreSQL database and Telegram bot token to execute end-to-end Telegram/DB runtime tests. Those credentials are deployment configuration, not source defects.
