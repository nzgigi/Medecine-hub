import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { BOT_DATA_DIR, SITE_DIR } from "./config.js";

fs.mkdirSync(BOT_DATA_DIR, { recursive: true });

/** Base propre au bot (défis, réponses, temps d'étude, état des tâches). */
export const botDb = new DatabaseSync(path.join(BOT_DATA_DIR, "bot.sqlite3"));
botDb.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,               -- 'daily' | 'free'
    day TEXT NOT NULL,                -- YYYY-MM-DD (Europe/Paris)
    channel_id TEXT NOT NULL,
    message_id TEXT UNIQUE,
    exam TEXT NOT NULL,               -- ex. "acv-anatomie-s3_2022"
    question_id INTEGER NOT NULL,
    correct TEXT NOT NULL,            -- JSON ["A","C"]
    closed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS answers (
    challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    given TEXT NOT NULL,
    is_correct INTEGER NOT NULL,
    answered_at TEXT NOT NULL,
    PRIMARY KEY (challenge_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS voice_time (
    user_id TEXT NOT NULL,
    week TEXT NOT NULL,               -- lundi de la semaine, YYYY-MM-DD (Europe/Paris)
    seconds INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, week)
  );
`);

export function kvGet(key) {
  const row = botDb.prepare("SELECT value FROM kv WHERE key = ?").get(key);
  return row ? row.value : null;
}
export function kvSet(key, value) {
  botDb.prepare("INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, String(value));
}

// ── Base du site : ouverte à la demande, lecture seule (sauf signalements, cf. resolveReport).
const SITE_DB_PATH = path.join(SITE_DIR, "data", "db", "medecine-hub.sqlite3");
let siteRead = null;
export function siteDb() {
  if (!fs.existsSync(SITE_DB_PATH)) return null;
  if (!siteRead) {
    siteRead = new DatabaseSync(SITE_DB_PATH, { readOnly: true });
    siteRead.exec("PRAGMA busy_timeout = 5000;");
  }
  return siteRead;
}

/** Marque un signalement comme résolu (même requête que le panneau admin du site). */
export function resolveReport(id) {
  if (!fs.existsSync(SITE_DB_PATH)) return false;
  const db = new DatabaseSync(SITE_DB_PATH);
  try {
    db.exec("PRAGMA busy_timeout = 5000;");
    return db.prepare("UPDATE question_reports SET status = 'resolu' WHERE id = ?").run(id).changes > 0;
  } finally {
    db.close();
  }
}

export const ADMIN_LOG_PATH = path.join(SITE_DIR, "data", "admin", "logs.json");
