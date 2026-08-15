# ANGELA v23 — Treasury / Multisig Architecture

## Principle
ANGELA never stores a treasury private key and never signs blockchain transactions on the API server.

The API prepares an execution job containing recipient, amount, chain, asset type and calldata. A Safe/multisig or external treasury processor performs the actual signing/broadcast.

## Flow
1. User requests withdrawal after launch unlock.
2. Operator approves → `processing`.
3. Treasury role prepares a `treasury_job`.
4. Job is submitted to the external multisig/manual processor with an external reference.
5. The external signer broadcasts the real transaction.
6. Treasury role records the real `txHash`.
7. The withdrawal can then be marked `completed` using the existing completion route.

## Safety
- No private keys in `.env` or database.
- `txHash` must be a 32-byte EVM transaction hash.
- Recipient is derived from the verified wallet stored on the withdrawal.
- Token/native asset configuration comes from `treasury_accounts`, not the browser.
- Before launch, `/api/withdrawals` remains blocked by `WITHDRAWALS_ENABLED=false`.

## Required production configuration
Create an active `treasury_accounts` row for each supported chain/asset. Example fields:
- `chain`: `evm`
- `treasury_address`: Safe/multisig treasury address
- `asset_type`: `erc20` or `native`
- `token_contract`: token contract for ERC20
- `decimals`: token decimals
- `execution_mode`: `multisig`

The external Safe/multisig integration is intentionally not faked in v23. `external_reference` identifies the real Safe proposal or treasury processor job.
