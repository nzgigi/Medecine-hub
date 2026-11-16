import crypto from "crypto";
import { getDb } from "./db";
import { ADMIN_GOOGLE_WHITELIST } from "./security";

/**
 * Domaines e-mail autorisés à utiliser le site (étudiants et personnels de
 * l'université de Toulouse). Comparaison stricte sur le domaine complet :
 * "x@univ-tlse3.fr.evil.com" ou "x@etu.univ-tlse3.fr" sont refusés.
 */
export const ALLOWED_EMAIL_DOMAINS = ["utoulouse.fr", "univ-tlse3.fr"];

export const SESSION_COOKIE_NAME = "mh_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

const CODE_TTL_MS = 1000 * 60 * 10;
const CODE_RESEND_COOLDOWN_MS = 1000 * 60;
const CODE_MAX_ATTEMPTS = 5;

export function normalizeEmail(value: unknown): string {
  if (typeof value !== "string") throw new Error("Adresse e-mail invalide");

  const email = value.trim().toLowerCase();

  if (email.length > 180 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Adresse e-mail invalide");
  }

  return email;
}

export function isAllowedEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at < 1) return false;

  const domain = normalized.slice(at + 1);

  // Les deux administrateurs gardent l'accès avec leur compte habituel.
  return (
    ALLOWED_EMAIL_DOMAINS.includes(domain) ||
    ADMIN_GOOGLE_WHITELIST.includes(normalized)
  );
}

export const FORBIDDEN_EMAIL_MESSAGE =
  "Ce site est réservé aux adresses @utoulouse.fr et @univ-tlse3.fr.";

function getSecret() {
  return (
    process.env.SESSION_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "medecine-hub-dev-secret"
  );
}

function hmac(value: string) {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("base64url");
}

/** Identifiant stable (compatible avec sanitizeSub) pour un compte e-mail. */
export function subForEmail(email: string): string {
  return (
    "etu_" +
    crypto.createHash("sha256").update(email).digest("hex").slice(0, 32)
  );
}

export function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const name = local
    .split(/[._-]+/)
    .filter((part) => /^\p{L}+$/u.test(part))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return name.length >= 2 ? name.slice(0, 40) : "Etudiant";
}

// --- Session (cookie signé) -------------------------------------------------

interface SessionPayload {
  sub: string;
  email: string;
  exp: number;
}

export function createSessionToken(sub: string, email: string): string {
  const payload: SessionPayload = {
    sub,
    email,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");

  return `${encoded}.${hmac(`session:${encoded}`)}`;
}

export function verifySessionToken(
  token: string | null | undefined
): SessionPayload | null {
  if (!token) return null;

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = Buffer.from(hmac(`session:${encoded}`));
  const received = Buffer.from(signature);

  if (
    expected.length !== received.length ||
    !crypto.timingSafeEqual(expected, received)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf-8")
    ) as SessionPayload;

    if (!payload.sub || !payload.email || payload.exp <= Date.now()) return null;
    // Re-vérifié à chaque requête : retirer un domaine coupe les sessions.
    if (!isAllowedEmail(payload.email)) return null;

    return payload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  };
}

// --- Codes à usage unique ----------------------------------------------------

let tableReady = false;

function ensureCodesTable() {
  const db = getDb();

  if (!tableReady) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS login_codes (
        email TEXT PRIMARY KEY,
        code_hash TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        sent_at INTEGER NOT NULL
      );
    `);
    tableReady = true;
  }

  return db;
}

function hashCode(email: string, code: string) {
  return hmac(`code:${email}:${code}`);
}

export type IssueCodeResult =
  | { ok: true; code: string }
  | { ok: false; retryAfterSeconds: number };

export function issueLoginCode(email: string): IssueCodeResult {
  const db = ensureCodesTable();
  const now = Date.now();

  const existing = db
    .prepare(`SELECT sent_at FROM login_codes WHERE email = ?`)
    .get(email) as { sent_at: number } | undefined;

  if (existing && now - existing.sent_at < CODE_RESEND_COOLDOWN_MS) {
    return {
      ok: false,
      retryAfterSeconds: Math.ceil(
        (CODE_RESEND_COOLDOWN_MS - (now - existing.sent_at)) / 1000
      ),
    };
  }

  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");

  db.prepare(
    `INSERT INTO login_codes (email, code_hash, expires_at, attempts, sent_at)
     VALUES (?, ?, ?, 0, ?)
     ON CONFLICT(email) DO UPDATE SET
       code_hash = excluded.code_hash,
       expires_at = excluded.expires_at,
       attempts = 0,
       sent_at = excluded.sent_at`
  ).run(email, hashCode(email, code), now + CODE_TTL_MS, now);

  return { ok: true, code };
}

export function consumeLoginCode(
  email: string,
  code: string
): "ok" | "invalid" | "expired" | "locked" {
  const db = ensureCodesTable();
  const row = db
    .prepare(
      `SELECT code_hash, expires_at, attempts FROM login_codes WHERE email = ?`
    )
    .get(email) as
    | { code_hash: string; expires_at: number; attempts: number }
    | undefined;

  if (!row) return "invalid";

  if (row.expires_at <= Date.now()) {
    db.prepare(`DELETE FROM login_codes WHERE email = ?`).run(email);
    return "expired";
  }

  if (row.attempts >= CODE_MAX_ATTEMPTS) return "locked";

  const expected = Buffer.from(row.code_hash);
  const received = Buffer.from(hashCode(email, code));
  const matches =
    expected.length === received.length &&
    crypto.timingSafeEqual(expected, received);

  if (!matches) {
    db.prepare(
      `UPDATE login_codes SET attempts = attempts + 1 WHERE email = ?`
    ).run(email);
    return "invalid";
  }

  db.prepare(`DELETE FROM login_codes WHERE email = ?`).run(email);
  return "ok";
}

// --- Limitation de débit par IP (en mémoire) --------------------------------

const hits = new Map<string, number[]>();

export function isRateLimited(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= max) {
    hits.set(key, recent);
    return true;
  }

  hits.set(key, [...recent, now]);
  return false;
}

export function clientKey(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
