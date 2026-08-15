// Production service blueprint: PostgreSQL-backed sessions and atomic points ledger.
// Wire these functions to pg/Prisma/Drizzle in deployment.

export async function createSession(db, userId) {
  // Use a cryptographically random opaque token stored hashed in DB.
  // Return only the raw token to the client over HTTPS.
  throw new Error("IMPLEMENT_WITH_DATABASE");
}

export async function awardPoints(db, userId, amount, reason, referenceId) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("INVALID_REWARD");
  // Production transaction:
  // 1) INSERT points_ledger with a unique reference_id.
  // 2) UPDATE users SET points = points + amount.
  // 3) Commit atomically.
  // A unique reference_id prevents duplicate rewards.
  throw new Error("IMPLEMENT_WITH_DATABASE_TRANSACTION");
}

export async function completeTaskOnce(db, userId, taskId, reward) {
  // Production transaction:
  // INSERT task_completions; on conflict do nothing.
  // Only if inserted, call awardPoints.
  throw new Error("IMPLEMENT_WITH_DATABASE_TRANSACTION");
}
