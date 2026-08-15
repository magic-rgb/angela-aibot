# ANGELA v11 — PostgreSQL + Telegram Auth

Implemented:
- PostgreSQL Pool
- Transaction helper
- Server-side opaque session cookie
- Telegram Mini App initData verification
- User upsert on Telegram login
- `/api/me`
- Atomic one-time Task reward transaction
- Health endpoint with database check

Required deployment steps:
1. Provision PostgreSQL.
2. Run the existing schema plus session schema.
3. Set DATABASE_URL, DATABASE_SSL and TELEGRAM_BOT_TOKEN.
4. Install backend dependencies and start the API.
5. Put the API behind HTTPS.
6. Connect the Mini App frontend to `/api/auth/telegram`.
7. Do not expose reward amounts from the client as authoritative; the production task catalog must determine rewards server-side.

Note: `secure:true` cookies require HTTPS in production.
