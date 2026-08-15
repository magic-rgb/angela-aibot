# V25 — Strengthened Task Verification

## What changed

Task verification is no longer a pure client-timed link visit for all tasks.

### New module
`backend/api/task-verification.js`

### Supported modes

| Mode | Description | Proof |
|------|-------------|-------|
| `telegram_member` | Real membership check via Telegram Bot API `getChatMember` | Server calls Telegram |
| `link_visit` | Timed single-use attempt token + anti-abuse | Attempt token + min elapsed time |
| `checkin` | Daily server check-in | Server date uniqueness |

### Anti-abuse improvements

- Default minimum wait raised from **8s → 12s** (configurable per task and via env)
- Attempt tokens remain single-use and expire (default 5 minutes)
- **Max 8 start attempts per user per task per day**
- Clear error codes returned to the client (`ACTION_TOO_FAST`, `NOT_A_MEMBER`, `TOO_MANY_ATTEMPTS`, …)
- Full audit log on successful completion (method + Telegram status when applicable)

### Primary Telegram task

```js
{
  id: "tg_join",
  mode: "telegram_member",
  chatId: "@angelaCommunity",   // bot must be admin in this channel/group
  minSeconds: 15,
  reward: 1000
}
```

**Requirement:** The bot must be added as **administrator** to the target channel/group so `getChatMember` works.

### Environment variables (optional)

```env
ACTION_MIN_SECONDS=12
ACTION_ATTEMPT_TTL_MS=300000
MAX_TASK_ATTEMPTS_PER_DAY=8
```

### API behaviour (summary)

1. `POST /api/tasks/:id/start`  
   Creates attempt token (for both `link_visit` and `telegram_member`).

2. User opens the link / joins the channel.

3. `POST /api/tasks/:id/verify` with `{ attemptToken }`  
   - Consumes token  
   - For `telegram_member`: calls Telegram API and requires membership  
   - Awards points only if all checks pass

### Client notes

Frontend already waits `attempt.minSeconds` before calling verify.  
No breaking change required for existing flow; it will automatically respect the new higher `minSeconds` values returned by the server.

### Recommended next steps

1. Set the real `chatId` for your channel (username or numeric id).
2. Make the bot an admin of that channel.
3. Optionally tighten rate limits further on `/api/tasks/*/start` and `/verify`.
4. For X / Discord / YouTube, real verification still requires third-party APIs or manual review; keep `link_visit` + strong anti-abuse for now.
