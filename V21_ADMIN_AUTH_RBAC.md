# ANGELA v21 — Admin Authentication + RBAC

## Implemented
- Password-based admin login using Node `scrypt` (no plaintext passwords).
- HttpOnly admin session cookie with hashed server-side session token.
- Admin roles: `viewer`, `operator`, `treasury`, `superadmin`.
- Withdrawal permissions:
  - viewer: read queue
  - operator: approve/reject
  - treasury: complete with real txHash
  - superadmin: all of the above
- Admin logout and current-session endpoint.
- Existing launch lock remains server-side and defaults to `WITHDRAWALS_ENABLED=false`.
- Existing audit trail records admin actions.
- `mfa_enabled` / encrypted secret columns are migration-ready, but MFA is not falsely represented as implemented; a real TOTP/WebAuthn flow is a separate security step.

## Bootstrap
Run the migration first:

`npm run migrate`

Then create/update an admin:

`npm run admin:create -- admin@example.com 'CHANGE_THIS_STRONG_PASSWORD' superadmin`

Do not put production credentials in source control.

## API
- POST `/api/admin/auth/login`
- POST `/api/admin/auth/logout`
- GET `/api/admin/auth/me`

Admin withdrawal APIs now enforce RBAC server-side.
