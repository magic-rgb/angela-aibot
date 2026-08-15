# ANGELA — Launch Run

## 1. Backend

```bash
cd backend/api
npm install
cp .env.example .env
# Fill DATABASE_URL, TELEGRAM_BOT_TOKEN, FRONTEND_ORIGIN and MFA_ENCRYPTION_KEY.
# Keep WALLET_ENABLED=false and WITHDRAWALS_ENABLED=false.
npm run migrate
npm start
```

## 2. Frontend
Serve `angela_work/` from the HTTPS origin configured in `FRONTEND_ORIGIN`.

## 3. Telegram
Configure the Telegram Mini App URL to the HTTPS frontend URL and keep the bot token on the server only.

## 4. Pre-launch state
- Wallet: CLOSED
- Withdrawals: CLOSED
- Token: NOT CREATED
- Points: ACTIVE
- Missions: ACTIVE
- Daily: ACTIVE
- Referrals: ACTIVE
- Referral milestone: 3 qualified referrals → 2,500 points once
