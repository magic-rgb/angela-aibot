# ANGELA v16 — Wallet Signature Verification + Withdrawal

## Implemented in this package

### Wallet ownership
- `POST /api/wallet/challenge`
- Server-generated nonce and expiring signed message
- EVM `personal_sign` verification with `ethers`
- Recovered address must exactly match the requested wallet
- One-time challenge consumption
- Wallet cannot silently be rebound to a different address
- Successful verification creates the server-side vesting activation timestamp

### Vesting
- Lock 1: wallet verification/activation
- Lock 2: one calendar month after activation
- Lock 3: two calendar months after activation
- Server calculates unlocked/locked points
- Frontend cannot unlock a lock

### Withdrawal
- `POST /api/withdrawals`
- Server reads points from PostgreSQL
- Server reads activation/vesting state from PostgreSQL
- Pending/processing withdrawals are reserved
- Minimum withdrawal is configurable
- Destination is the already verified wallet
- Request creates a `pending` withdrawal record only

Important: this release does NOT pretend to execute an on-chain payout. A treasury/withdrawal processor must later move the request from `pending` to `processing/completed` and write the transaction hash.

### Security correction
`POST /api/tasks/:id/complete` is now explicitly disabled. The old v15 route accepted a client-supplied `reward`; v16 never accepts a client reward amount.

## Database

Run these in order against the existing database:

1. `schema.sql`
2. `session-schema.sql`
3. `wallet-schema.sql`
4. `daily-referral-schema.sql`
5. `v16-wallet-withdrawal-schema.sql`

For an existing v15 database, run only the missing v16 migration after the prior schemas are already present.

## Frontend

The Wallet page now:
- loads server-side wallet/vesting data
- connects to an EVM wallet when `window.ethereum` is available
- requests a server challenge
- asks the wallet to sign the exact server message
- submits the signature for server verification
- requests withdrawal using server-calculated available points

No localStorage vesting state is used for Wallet eligibility.

## Production prerequisites still required

- HTTPS deployment
- real PostgreSQL
- `TELEGRAM_BOT_TOKEN`
- real `FRONTEND_ORIGIN`
- supported EVM wallet environment in Telegram
- approved treasury/withdrawal processor
- external task verification adapters
- admin authentication and role controls
- persistent distributed rate limiting
- monitoring and security review

## Withdrawal policy defaults

- 100 points = 1 ANGELA unit
- minimum withdrawal = 1,000 points
- one user's pending/processing requests reserve available vested points
- only the verified wallet address can be the withdrawal destination

These are configuration defaults, not immutable tokenomics. Change them only through an explicit product decision.
