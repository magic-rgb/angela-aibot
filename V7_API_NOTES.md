# ANGELA v7 — API Integration Scaffold

This release adds a runnable Express API scaffold and connects the agreed task catalog to explicit endpoints.

Important:
- It is NOT a production backend yet.
- `/verify`, wallet activation, and withdrawals intentionally return `501` until real authentication, database persistence, and platform verification are implemented.
- Never award points based only on a browser request.
- Next production step: PostgreSQL + Telegram initData verification + admin authentication + server-side ledger.
