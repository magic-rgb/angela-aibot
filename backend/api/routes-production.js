// ANGELA v10 production route contract.
// These handlers require the session/database functions from v9.
// They are intentionally framework-neutral and should be wired to Express/Fastify.

export const routes = {
  auth: {
    method: "POST",
    path: "/api/auth/telegram",
    behavior: [
      "Verify Telegram Mini App initData with bot token",
      "Create or update user",
      "Create opaque server session",
      "Return user profile and session"
    ]
  },

  me: {
    method: "GET",
    path: "/api/me",
    behavior: [
      "Authenticate session",
      "Return points, XP, referral code and vesting state"
    ]
  },

  tasks: {
    method: "GET",
    path: "/api/tasks",
    behavior: [
      "Return active primary and secondary tasks"
    ]
  },

  taskVerify: {
    method: "POST",
    path: "/api/tasks/:id/verify",
    behavior: [
      "Authenticate session",
      "Verify platform action where API/permission permits",
      "Insert one task completion",
      "Award points atomically only on first completion"
    ]
  },

  daily: {
    method: "GET",
    path: "/api/daily-challenges",
    behavior: [
      "Return today's challenge set",
      "Return the current user's completion state"
    ]
  },

  dailyVerify: {
    method: "POST",
    path: "/api/daily-challenges/:id/verify",
    behavior: [
      "Authenticate session",
      "Verify activity",
      "Enforce one reward per user/challenge/day",
      "Award points atomically"
    ]
  },

  referral: {
    method: "GET",
    path: "/api/referral",
    behavior: [
      "Return referral code",
      "Return invited and qualified counts"
    ]
  },

  walletActivate: {
    method: "POST",
    path: "/api/wallet/activate",
    behavior: [
      "Authenticate session",
      "Validate wallet ownership/signature",
      "Persist activation timestamp",
      "Unlock vesting lock 1"
    ]
  },

  vesting: {
    method: "GET",
    path: "/api/wallet/vesting",
    behavior: [
      "Calculate lock 1, 2 and 3 from the server activation timestamp"
    ]
  }
};
