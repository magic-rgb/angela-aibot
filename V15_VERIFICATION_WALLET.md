# ANGELA v15 — Verification + Wallet/Vesting Layer

Added:
- Server-side verification adapter contract.
- Wallet database model.
- Server-side three-lock vesting calculator:
  - Lock 1: wallet activation
  - Lock 2: one month after activation
  - Lock 3: two months after activation
- Frontend API bridge for task verification and wallet/vesting endpoints.

Important:
- No external platform verification is falsely marked as complete.
- Wallet ownership must be validated with a real signature challenge before activation.
- Withdrawal must use server-side balance + vesting calculations.
- The frontend cannot unlock any vesting lock by itself.
