# ANGELA v17 Handoff

v17 continues v16 without rebuilding the project.

Completed:
- Withdrawal state machine: pending, processing, completed, rejected.
- Admin approval/rejection/completion endpoints.
- Transaction hash validation and uniqueness.
- Completed withdrawals now reduce future withdrawal availability, preventing double withdrawal of the same vested balance.
- Admin API key authentication.

Not yet production-complete:
- Real treasury wallet signer/broadcaster.
- Multisig or approval workflow.
- Redis/shared rate limiting.
- Full migration runner.
- Real platform verification adapters.
- Admin web UI wired to authenticated admin API.
