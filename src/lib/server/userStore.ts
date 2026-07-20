import fs from "fs";
import { safeJoinInside } from "./security";

export interface StoredUser {
  sub: string;
  name: string;
  email: string;
  picture?: string;
  avatarPath?: string;
  firstSeenAt: string;
  lastSeenAt: string;
}

type UsersStore = Record<string, StoredUser>;

function getStorePath() {
  const dir = safeJoinInside(process.cwd(), "data", "users");

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return safeJoinInside(dir, "users.json");
}

export function readUsers(): UsersStore {
  const storePath = getStorePath();

  if (!fs.existsSync(storePath)) return {};

  try {
    return JSON.parse(fs.readFileSync(storePath, "utf-8")) as UsersStore;
  } catch {
    return {};
  }
}

function writeUsers(store: UsersStore) {
  fs.writeFileSync(getStorePath(), JSON.stringify(store, null, 2), "utf-8");
}

export function upsertUser(profile: {
  sub: string;
  name: string;
  email: string;
  picture?: string;
}): StoredUser {
  const store = readUsers();
  const now = new Date().toISOString();
  const existing = store[profile.sub];

  const user: StoredUser = {
    sub: profile.sub,
    name: profile.name,
    email: profile.email,
    picture: profile.picture,
    avatarPath: existing?.avatarPath,
    firstSeenAt: existing?.firstSeenAt ?? now,
    lastSeenAt: now,
  };

  store[profile.sub] = user;
  writeUsers(store);

  return user;
}

export function setUserAvatar(sub: string, avatarPath: string | undefined) {
  const store = readUsers();
  const user = store[sub];

  if (!user) return null;

  user.avatarPath = avatarPath;
  store[sub] = user;
  writeUsers(store);

  return user;
}

export function sanitizeSub(value: unknown): string {
  if (typeof value !== "string") throw new Error("Identifiant invalide");

  const sub = value.trim();

  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(sub)) {
    throw new Error("Identifiant invalide");
  }

  return sub;
}
