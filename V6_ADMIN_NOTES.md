# ANGELA v6 — Admin Console Foundation

Added an admin UI foundation for:
- task management
- daily challenge management
- reward configuration
- vesting overview
- security reminders

Production requirements:
- admin authentication (session/JWT + 2FA recommended)
- role-based permissions
- server-side audit log
- real API wiring to `/api/admin/*`
- CSRF protection where applicable
- no secrets in frontend
