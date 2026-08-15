// ANGELA v15 — verification and vesting service contract.
// Do not accept `verified=true` from the browser.
// Each platform requires a server-side adapter with the required permissions.

export async function verifyTask({ platform, user, task, adapter }) {
  if (!adapter || typeof adapter.verify !== "function") {
    throw new Error("VERIFICATION_ADAPTER_NOT_CONFIGURED");
  }
  return Boolean(await adapter.verify({ user, task, platform }));
}

export function calculateVesting(activatedAt, now = new Date()) {
  if (!activatedAt) {
    return {
      activated: false,
      locks: [
        { id: 1, unlocked: false },
        { id: 2, unlocked: false },
        { id: 3, unlocked: false }
      ]
    };
  }

  const start = new Date(activatedAt);
  const month1 = new Date(start);
  month1.setMonth(month1.getMonth() + 1);
  const month2 = new Date(start);
  month2.setMonth(month2.getMonth() + 2);

  return {
    activated: true,
    activatedAt: start.toISOString(),
    locks: [
      { id: 1, unlocked: true, unlockedAt: start.toISOString() },
      { id: 2, unlocked: now >= month1, unlockedAt: month1.toISOString() },
      { id: 3, unlocked: now >= month2, unlockedAt: month2.toISOString() }
    ]
  };
}
