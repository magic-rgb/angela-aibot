# ANGELA v24 — Launch Audit & Functional Fixes

- Server-authoritative task/link rewards enabled for pre-launch.
- Daily check-in + daily link-visit rewards enabled.
- Referral start parameter attribution fixed.
- Referral qualification fixed on first completed task.
- Referral dashboard reads real counts from PostgreSQL.
- Admin MFA login flow wired into Admin Console.
- Admin launch status reads backend state.
- Header menu/notification buttons now have functional feedback.
- Hard-coded `t.me/AngelaBot` referral URL removed; production bot username is resolved from Telegram Bot API.
- Wallet and withdrawals remain locked.
