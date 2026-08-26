import crypto from "crypto";
import { scoreShareSignaturePayload, type SignedScoreShareParams } from "@/lib/shareScore";

function getScoreShareSecret() {
  return (
    process.env.SCORE_SHARE_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "medecine-hub-dev-secret"
  );
}

export function signScoreShare(params: SignedScoreShareParams): string {
  return crypto
    .createHmac("sha256", getScoreShareSecret())
    .update(scoreShareSignaturePayload(params))
    .digest("base64url");
}

export function verifyScoreShareSignature(
  params: SignedScoreShareParams,
  signature: string | null | undefined
): boolean {
  if (!signature) return false;

  const expected = signScoreShare(params);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length) return false;

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}
