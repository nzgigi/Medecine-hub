import { SITE_INTERNAL_URL } from "./config.js";
import { siteDb } from "./db.js";

const DAY_MS = 86_400_000;
const isoAgo = (ms) => new Date(Date.now() - ms).toISOString();

const count = (db, sql, ...params) => Number(db.prepare(sql).get(...params).c);

/** Chiffres clés du site (null si la base du site est introuvable). */
export function siteCounts() {
  const db = siteDb();
  if (!db) return null;
  const since = isoAgo(DAY_MS);
  return {
    users: count(db, "SELECT COUNT(*) c FROM users"),
    newUsers24h: count(db, "SELECT COUNT(*) c FROM users WHERE first_seen_at >= ?", since),
    attempts: count(db, "SELECT COUNT(*) c FROM qcm_attempts"),
    attempts24h: count(db, "SELECT COUNT(*) c FROM qcm_attempts WHERE completed_at >= ?", since),
    activeUsers24h: count(db, "SELECT COUNT(DISTINCT user_sub) c FROM qcm_attempts WHERE completed_at >= ?", since),
    reportsPending: count(db, "SELECT COUNT(*) c FROM question_reports WHERE status = 'nouveau'"),
    reports24h: count(db, "SELECT COUNT(*) c FROM question_reports WHERE created_at >= ?", since),
  };
}

export function topMatieres24h(limit = 3) {
  const db = siteDb();
  if (!db) return [];
  return db.prepare(
    "SELECT matiere, COUNT(*) AS n FROM qcm_attempts WHERE completed_at >= ? GROUP BY matiere ORDER BY n DESC LIMIT ?"
  ).all(isoAgo(DAY_MS), limit).map((r) => ({ matiere: r.matiere, n: Number(r.n) }));
}

/** Pic de visiteurs connectés sur les dernières 24 h. */
export function presencePeak24h() {
  const db = siteDb();
  if (!db) return null;
  const row = db.prepare("SELECT MAX(peak) AS p FROM presence_hourly WHERE hour >= ?").get(isoAgo(DAY_MS));
  return row?.p == null ? 0 : Number(row.p);
}

/** Visiteurs connectés en ce moment (API interne du site) ; null si injoignable. */
export async function onlineNow() {
  try {
    const response = await fetch(`${SITE_INTERNAL_URL}/api/presence/online`, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) return null;
    const data = await response.json();
    return Array.isArray(data.handles) ? data.handles.length : null;
  } catch {
    return null;
  }
}

/** Profil public (mêmes chiffres que la page /profil/[handle]) recherché par identifiant ou nom exact. */
export function findProfile(query) {
  const db = siteDb();
  if (!db) return null;
  const q = String(query).trim().replace(/^@/, "");
  if (!q) return null;
  const user = db.prepare("SELECT sub, handle, name, first_seen_at FROM users WHERE handle = ? COLLATE NOCASE OR name = ? COLLATE NOCASE LIMIT 1").get(q, q);
  if (!user) return null;
  const stats = db.prepare(`
    SELECT COUNT(*) AS attempts,
           COUNT(DISTINCT matiere) AS matieres
    FROM qcm_attempts WHERE user_sub = ?
  `).get(user.sub);
  return {
    handle: user.handle,
    name: user.name,
    memberSince: user.first_seen_at,
    attempts: Number(stats.attempts),
    matieres: Number(stats.matieres),
    achievements: count(db, "SELECT COUNT(*) c FROM user_achievements WHERE user_sub = ?", user.sub),
    followers: count(db, "SELECT COUNT(*) c FROM follows WHERE followee_sub = ?", user.sub),
  };
}
