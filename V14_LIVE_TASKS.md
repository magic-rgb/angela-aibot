# ANGELA v14 — Live Data UI Layer

Added frontend helpers for server-driven:
- profile / points / XP
- primary and secondary tasks
- daily challenges
- referral data

The frontend can now request these datasets from the backend instead of treating local demo data as authoritative.

Important:
- The backend must expose the corresponding authenticated endpoints.
- Task and daily verification must still be performed server-side.
- UI completion buttons should refresh from the server after a successful verification.
