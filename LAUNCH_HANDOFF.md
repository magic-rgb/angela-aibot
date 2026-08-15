# ANGELA — Launch Handoff Build

This build is the **pre-launch handoff**. It is not a token launch and it does not open Wallet or Withdrawals.

## Locked until launch

- `WALLET_ENABLED=false`
- `WITHDRAWALS_ENABLED=false`
- No ANGELA mint address is required.
- No treasury address is required.
- No multisig is required.
- No private key is stored by the application.

## Server authority

Points, XP, task completion, daily rewards, referral state, sessions, vesting and withdrawal eligibility are server/database controlled. The browser does not award points or persist reward balances.

## Wallet / token

The production direction is **Solana**, but the token has not been created yet. The build therefore does not hard-code a mint, token program, decimals, treasury or on-chain settlement provider.

When launch configuration is ready, the Wallet provider can be activated with `WALLET_ENABLED=true` and the Solana-specific provider implementation can be enabled without changing the points ledger or vesting source of truth.

## External verification

Social verification adapters are not faked. If an external platform API/permission is not configured, the endpoint returns `VERIFICATION_NOT_CONFIGURED` and no points are awarded.

## Launch sequence

1. Deploy database and run `npm run migrate`.
2. Configure Telegram bot token, frontend origin, secure cookies and MFA encryption key.
3. Configure production verification integrations.
4. Run `npm run check:launch` with Wallet and Withdrawals still disabled.
5. QA the Mini App inside Telegram.
6. After the official launch decision, configure the real Solana token/wallet provider.
7. Only after launch configuration is verified, enable Wallet.
8. Enable withdrawals only when treasury/settlement controls are ready.
