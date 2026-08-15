# ANGELA v17 — Withdrawal Processing & Admin

## Implemented
- Server-side withdrawal reservation now subtracts `pending`, `processing`, and `completed` withdrawals from future availability.
- Admin API protected by `x-admin-key` and `ADMIN_API_KEY`.
- `pending -> processing` approval.
- `pending/processing -> rejected` with reason.
- `processing -> completed` only with a validated EVM transaction hash.
- Unique transaction hash constraint prevents duplicate settlement records.
- Pending/processing withdrawals can be listed for an operator.

## Important boundary
v17 does **not** sign or broadcast blockchain transactions. The actual treasury processor remains an external execution step. The API records the result only after an operator/processor supplies the transaction hash.

## Admin endpoints
- `GET /api/admin/withdrawals`
- `POST /api/admin/withdrawals/:id/approve`
- `POST /api/admin/withdrawals/:id/reject` body `{ "reason": "..." }`
- `POST /api/admin/withdrawals/:id/complete` body `{ "txHash": "0x..." }`

All require `x-admin-key` matching `ADMIN_API_KEY`.

## Migration order
1. Existing v16 schema
2. `v17-withdrawal-admin-schema.sql`

## Production requirement
Use a long random admin secret and place the Admin API behind HTTPS. For a multi-instance deployment, replace the in-memory rate limiter with Redis or another shared limiter.
