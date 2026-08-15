import { tx } from "./db.js";

// Server-authoritative daily challenges and referral qualification.
// Platform verification adapters must be plugged in before rewards are issued.

export async function getDailyChallenges(client, date) {
  const { rows } = await client.query(
    `SELECT id, platform, title, url, reward_points
     FROM daily_challenges
     WHERE challenge_date=$1 AND active=true
     ORDER BY id`,
    [date]
  );
  return rows;
}

export async function completeDailyChallenge(client, userId, challengeId, date, verified) {
  if (!verified) throw new Error("ACTIVITY_NOT_VERIFIED");

  const challenge = await client.query(
    `SELECT reward_points FROM daily_challenges
     WHERE id=$1 AND challenge_date=$2 AND active=true`,
    [challengeId, date]
  );
  if (!challenge.rowCount) throw new Error("CHALLENGE_NOT_FOUND");

  const reward = Number(challenge.rows[0].reward_points);
  const inserted = await client.query(
    `INSERT INTO daily_completions(user_id,challenge_id,challenge_date)
     VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING id`,
    [userId, challengeId, date]
  );
  if (!inserted.rowCount) return 0;

  await client.query(
    `INSERT INTO points_ledger(user_id,amount,reason,reference_id)
     VALUES($1,$2,'daily_challenge',$3)`,
    [userId,reward,`daily:${userId}:${challengeId}:${date}`]
  );
  await client.query(
    `UPDATE users SET points=points+$1,updated_at=NOW() WHERE id=$2`,
    [reward,userId]
  );
  return reward;
}

export async function qualifyReferral(client, referrerId, referredId) {
  if (referrerId === referredId) throw new Error("SELF_REFERRAL");

  const { rows } = await client.query(
    `SELECT id, qualified FROM referrals
     WHERE referrer_user_id=$1 AND referred_user_id=$2`,
    [referrerId,referredId]
  );
  if (!rows.length) throw new Error("REFERRAL_NOT_FOUND");
  if (rows[0].qualified) return false;

  await client.query(
    `UPDATE referrals SET qualified=true
     WHERE id=$1`,
    [rows[0].id]
  );
  return true;
}
