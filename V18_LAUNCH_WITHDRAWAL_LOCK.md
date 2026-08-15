# ANGELA v18 — Launch Withdrawal Lock

Withdrawals are now hard-locked server-side until launch.

## Configuration
`WITHDRAWALS_ENABLED=false` is the safe default in `.env.example`.

Set it to `true` only when ANGELA officially opens withdrawals.

## Enforcement
- GET `/api/wallet` exposes `withdrawalLaunch`.
- POST `/api/withdrawals` rejects requests with HTTP 423 while locked.
- Frontend displays the Withdraw button in a disabled launch-locked state.
- Frontend checks the server state, but is NOT trusted for enforcement.
- A pre-launch withdrawal attempt is audit logged.

## Launch flow
1. Keep `WITHDRAWALS_ENABLED=false` during pre-launch.
2. Deploy/restart backend with `WITHDRAWALS_ENABLED=true` at official launch.
3. Verify `/api/wallet` reports `status: OPEN`.
4. Users can then create withdrawal requests subject to normal eligibility rules.

No on-chain transfer occurs merely by opening the flag; existing Admin/Treasury processing remains required.
