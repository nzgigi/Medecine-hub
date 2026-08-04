import fs from "fs";
import { DatabaseSync } from "node:sqlite";
import { ADMIN_GOOGLE_WHITELIST, safeJoinInside } from "./security";

let dbInstance: DatabaseSync | null = null;

function getDbPath() {
  const dir = safeJoinInside(process.cwd(), "data", "db");

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return safeJoinInside(dir, "medecine-hub.sqlite3");
}

function slugifyHandle(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "membre"
  );
}

function generateUniqueHandle(db: DatabaseSync, name: string) {
  const base = slugifyHandle(name);
  const existsStatement = db.prepare(`SELECT 1 FROM users WHERE handle = ?`);

  if (!existsStatement.get(base)) return base;

  for (let suffix = 2; suffix < 10000; suffix++) {
    const candidate = `${base}-${suffix}`;
    if (!existsStatement.get(candidate)) return candidate;
  }

  return `${base}-${Date.now()}`;
}

function migrateLegacyUsersJson(db: DatabaseSync) {
  const legacyPath = safeJoinInside(process.cwd(), "data", "users", "users.json");

  if (!fs.existsSync(legacyPath)) return;

  const alreadyMigrated = db
    .prepare(`SELECT value FROM meta WHERE key = 'legacy_users_migrated'`)
    .get();

  if (alreadyMigrated) return;

  try {
    const legacyStore = JSON.parse(fs.readFileSync(legacyPath, "utf-8")) as Record<
      string,
      {
        sub: string;
        name: string;
        email: string;
        picture?: string;
        avatarPath?: string;
        firstSeenAt: string;
        lastSeenAt: string;
      }
    >;

    const insert = db.prepare(`
      INSERT OR IGNORE INTO users
        (sub, handle, name, email, picture, avatar_path, role, first_seen_at, last_seen_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const user of Object.values(legacyStore)) {
      const handle = generateUniqueHandle(db, user.name || "membre");
      const role = ADMIN_GOOGLE_WHITELIST.includes(user.email.toLowerCase())
        ? "administrateur"
        : "etudiant";

      insert.run(
        user.sub,
        handle,
        user.name,
        user.email,
        user.picture ?? null,
        user.avatarPath ?? null,
        role,
        user.firstSeenAt,
        user.lastSeenAt
      );
    }
  } catch (error) {
    console.error("Erreur migration data/users/users.json vers SQLite:", error);
    return;
  }

  db.prepare(
    `INSERT OR REPLACE INTO meta (key, value) VALUES ('legacy_users_migrated', ?)`
  ).run(new Date().toISOString());
}

function migrateAddNameCustomizedColumn(db: DatabaseSync) {
  const columns = db.prepare(`PRAGMA table_info(users)`).all() as { name: string }[];
  const hasColumn = columns.some((column) => column.name === "name_customized");

  if (!hasColumn) {
    db.exec(`ALTER TABLE users ADD COLUMN name_customized INTEGER NOT NULL DEFAULT 0;`);
  }
}

export function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;

  const db = new DatabaseSync(getDbPath());
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");

  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      sub TEXT PRIMARY KEY,
      handle TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      picture TEXT,
      avatar_path TEXT,
      role TEXT NOT NULL DEFAULT 'etudiant',
      name_customized INTEGER NOT NULL DEFAULT 0,
      first_seen_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS qcm_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_sub TEXT NOT NULL REFERENCES users(sub) ON DELETE CASCADE,
      matiere TEXT NOT NULL,
      annee INTEGER NOT NULL,
      score INTEGER NOT NULL,
      total INTEGER NOT NULL,
      questions_count INTEGER,
      completed_at TEXT NOT NULL,
      UNIQUE(user_sub, matiere, annee, completed_at)
    );

    CREATE INDEX IF NOT EXISTS idx_qcm_attempts_user ON qcm_attempts(user_sub);

    CREATE TABLE IF NOT EXISTS user_achievements (
      user_sub TEXT NOT NULL REFERENCES users(sub) ON DELETE CASCADE,
      achievement_key TEXT NOT NULL,
      earned_at TEXT NOT NULL,
      PRIMARY KEY (user_sub, achievement_key)
    );

    CREATE TABLE IF NOT EXISTS follows (
      follower_sub TEXT NOT NULL REFERENCES users(sub) ON DELETE CASCADE,
      followee_sub TEXT NOT NULL REFERENCES users(sub) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      PRIMARY KEY (follower_sub, followee_sub)
    );

    CREATE INDEX IF NOT EXISTS idx_follows_followee ON follows(followee_sub);
    CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_sub);

    CREATE TABLE IF NOT EXISTS activity_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_sub TEXT NOT NULL REFERENCES users(sub) ON DELETE CASCADE,
      type TEXT NOT NULL,
      payload TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_activity_events_user ON activity_events(user_sub, created_at);

    CREATE TABLE IF NOT EXISTS medtok_stats (
      user_sub TEXT PRIMARY KEY REFERENCES users(sub) ON DELETE CASCADE,
      total_answered INTEGER NOT NULL DEFAULT 0,
      total_correct INTEGER NOT NULL DEFAULT 0,
      best_streak INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
  `);

  migrateAddNameCustomizedColumn(db);

  dbInstance = db;
  migrateLegacyUsersJson(db);

  return db;
}

export { generateUniqueHandle };
