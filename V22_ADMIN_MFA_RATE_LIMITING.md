# ANGELA v22 — Admin MFA + Redis-ready Rate Limiting

## Implemented
- TOTP MFA using RFC 6238-style 6-digit codes.
- MFA secret encrypted at rest with AES-256-GCM using `MFA_ENCRYPTION_KEY`.
- Login becomes two-step when `mfa_enabled=true`.
- MFA challenge expires after 5 minutes and is limited to 5 attempts.
- Admin session stores `mfa_verified_at`; MFA-enabled admins cannot use an unverified session.
- MFA enrollment endpoints: `/api/admin/auth/mfa/enroll`, `/api/admin/auth/mfa/confirm`.
- MFA disable is restricted to `superadmin`.
- Expired/stale admin sessions and MFA challenges can be cleaned with the superadmin maintenance endpoint.
- Rate limiting uses Redis when `REDIS_URL` is configured, with a memory fallback for single-instance development.

## Production requirements
1. Set a strong `MFA_ENCRYPTION_KEY` from a secrets manager.
2. Configure managed Redis and `REDIS_URL` before horizontal scaling.
3. Use HTTPS and secure cookies.
4. Run `npm install` after adding the `redis` dependency.
5. Run `npm run migrate`.
6. Enroll every privileged admin in an authenticator app before launch.
7. Keep withdrawals locked until the launch switch is intentionally enabled.

## MFA flow
Password -> MFA challenge -> TOTP -> Admin session.

The backend never accepts an MFA code as proof of wallet ownership and never creates a blockchain transaction.
