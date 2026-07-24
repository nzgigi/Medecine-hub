import { getDb, generateUniqueHandle } from "./db";
import { ADMIN_GOOGLE_WHITELIST } from "./security";

export type UserRole = "etudiant" | "administrateur";

export interface StoredUser {
  sub: string;
  handle: string;
  name: string;
  email: string;
  picture?: string;
  avatarPath?: string;
  role: UserRole;
  firstSeenAt: string;
  lastSeenAt: string;
}

interface UserRow {
  sub: string;
  handle: string;
  name: string;
  email: string;
  picture: string | null;
  avatar_path: string | null;
  role: string;
  first_seen_at: string;
  last_seen_at: string;
}

function rowToUser(row: UserRow): StoredUser {
  return {
    sub: row.sub,
    handle: row.handle,
    name: row.name,
    email: row.email,
    picture: row.picture ?? undefined,
    avatarPath: row.avatar_path ?? undefined,
    role: row.role === "administrateur" ? "administrateur" : "etudiant",
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
  };
}

function roleForEmail(email: string): UserRole {
  return ADMIN_GOOGLE_WHITELIST.includes(email.toLowerCase())
    ? "administrateur"
    : "etudiant";
}

export function readUsers(): Record<string, StoredUser> {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM users`).all() as unknown as UserRow[];
  const store: Record<string, StoredUser> = {};

  for (const row of rows) {
    store[row.sub] = rowToUser(row);
  }

  return store;
}

export function getUserBySub(sub: string): StoredUser | null {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM users WHERE sub = ?`).get(sub) as
    | UserRow
    | undefined;

  return row ? rowToUser(row) : null;
}

export function getUserByHandle(handle: string): StoredUser | null {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM users WHERE handle = ?`).get(handle) as
    | UserRow
    | undefined;

  return row ? rowToUser(row) : null;
}

export function upsertUser(profile: {
  sub: string;
  name: string;
  email: string;
  picture?: string;
}): StoredUser {
  const db = getDb();
  const now = new Date().toISOString();
  const existing = getUserBySub(profile.sub);
  const role = roleForEmail(profile.email);

  if (existing) {
    db.prepare(
      `UPDATE users SET name = ?, email = ?, picture = ?, role = ?, last_seen_at = ? WHERE sub = ?`
    ).run(profile.name, profile.email, profile.picture ?? null, role, now, profile.sub);

    return { ...existing, name: profile.name, email: profile.email, picture: profile.picture, role, lastSeenAt: now };
  }

  const handle = generateUniqueHandle(db, profile.name || "membre");

  db.prepare(
    `INSERT INTO users (sub, handle, name, email, picture, avatar_path, role, first_seen_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)`
  ).run(profile.sub, handle, profile.name, profile.email, profile.picture ?? null, role, now, now);

  return {
    sub: profile.sub,
    handle,
    name: profile.name,
    email: profile.email,
    picture: profile.picture,
    role,
    firstSeenAt: now,
    lastSeenAt: now,
  };
}

export function setUserAvatar(sub: string, avatarPath: string | undefined) {
  const db = getDb();
  const existing = getUserBySub(sub);

  if (!existing) return null;

  db.prepare(`UPDATE users SET avatar_path = ? WHERE sub = ?`).run(avatarPath ?? null, sub);

  return { ...existing, avatarPath };
}

export function sanitizeSub(value: unknown): string {
  if (typeof value !== "string") throw new Error("Identifiant invalide");

  const sub = value.trim();

  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(sub)) {
    throw new Error("Identifiant invalide");
  }

  return sub;
}
