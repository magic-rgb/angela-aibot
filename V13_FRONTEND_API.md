# ANGELA v13 — Frontend API Bridge

Added to the frontend:
- `ANGELA_API.me()`
- `ANGELA_API.tasks()`
- `ANGELA_API.daily()`
- `ANGELA_API.referral()`
- `ANGELA_API.authenticateWithTelegram()`

The bridge uses credentialed requests so the server session cookie can be used.

Important:
- Set `window.ANGELA_API_BASE` to the deployed API origin if frontend and API are on different domains.
- Telegram Mini App `initData` is sent to the backend; the browser never validates it.
- The UI should render server values for points/XP and completion state.
- Reward values received from the server are informational; the server remains authoritative.
