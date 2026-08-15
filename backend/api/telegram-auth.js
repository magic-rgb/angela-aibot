import crypto from "crypto";

export function verifyTelegramInitData(initData, botToken, maxAgeSeconds=86400) {
  if (!initData || !botToken) throw new Error("MISSING_TELEGRAM_AUTH");
  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");
  const authDate = Number(params.get("auth_date"));
  if (!receivedHash || !authDate) throw new Error("INVALID_INIT_DATA");

  if (Math.floor(Date.now()/1000) - authDate > maxAgeSeconds) {
    throw new Error("EXPIRED_INIT_DATA");
  }

  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([a],[b]) => a.localeCompare(b))
    .map(([k,v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const expectedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (!crypto.timingSafeEqual(
    Buffer.from(expectedHash, "hex"),
    Buffer.from(receivedHash, "hex")
  )) throw new Error("INVALID_TELEGRAM_SIGNATURE");

  return { ...JSON.parse(params.get("user") || "{}"), start_param: params.get("start_param") || null };
}
