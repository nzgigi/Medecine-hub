import crypto from "crypto";
import path from "path";
import { NextResponse } from "next/server";

const ADMIN_TOKEN_TTL_MS = 1000 * 60 * 60 * 8;

export const ADMIN_GOOGLE_WHITELIST = [
  "p2cuisson@gmail.com",
  "nnzn4s1m@gmail.com",
];

export interface AdminIdentity {
  googleEmail?: string;
  googleName?: string;
  googlePicture?: string;
}

type AdminTokenPayload = {
  username: string;
  exp: number;
} & AdminIdentity;

function getAdminSecret() {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "medecine-hub-dev-secret"
  );
}

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf-8");
}

function sign(value: string) {
  return crypto.createHmac("sha256", getAdminSecret()).update(value).digest("base64url");
}

export function createAdminToken(username: string, identity?: AdminIdentity) {
  const payload: AdminTokenPayload = {
    username,
    exp: Date.now() + ADMIN_TOKEN_TTL_MS,
    ...identity,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

function decodeAdminToken(
  token: string | null | undefined
): AdminTokenPayload | null {
  if (!token) return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as AdminTokenPayload;
    if (!payload.username || payload.exp <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Renvoie l'identité de l'admin authentifié (utilisée pour le journal
 * d'actions). Suppose que `requireAdminRequest` a déjà validé la requête.
 */
export function getAdminActor(request: Request): AdminIdentity & {
  username: string;
} {
  const payload = decodeAdminToken(getBearerToken(request));

  return {
    username: payload?.username ?? "inconnu",
    googleEmail: payload?.googleEmail,
    googleName: payload?.googleName,
    googlePicture: payload?.googlePicture,
  };
}

export function verifyAdminToken(token: string | null | undefined) {
  if (!token) return false;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return false;

  const expectedSignature = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return false;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as AdminTokenPayload;
    return Boolean(payload.username && payload.exp > Date.now());
  } catch {
    return false;
  }
}

export function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;

  return authorization.slice("Bearer ".length).trim();
}

export function requireAdminRequest(request: Request) {
  if (verifyAdminToken(getBearerToken(request))) return null;

  return NextResponse.json(
    { success: false, message: "Authentification admin requise" },
    { status: 401 }
  );
}

export function sanitizeSlug(value: string) {
  const slug = value.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Slug invalide");
  }

  return slug;
}

export function sanitizeYear(value: string | number) {
  const year = Number(value);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Année invalide");
  }

  return String(year);
}

export function sanitizeQuestionId(value: string | number) {
  const questionId = Number(value);
  if (!Number.isInteger(questionId) || questionId < 1 || questionId > 10000) {
    throw new Error("Question invalide");
  }

  return String(questionId);
}

export function safeJoinInside(root: string, ...segments: string[]) {
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, ...segments);
  const relative = path.relative(resolvedRoot, resolvedPath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Chemin invalide");
  }

  return resolvedPath;
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
