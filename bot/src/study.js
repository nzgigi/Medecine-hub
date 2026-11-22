import { CH } from "./config.js";
import { botDb } from "./db.js";
import { weekStart } from "./util.js";

const MAX_SESSION_SECONDS = 12 * 3600;
const sessions = new Map(); // userId -> début (ms) de la période en cours dans un salon d'étude

export const isStudyChannel = (channelId) => !!channelId && CH.etude.includes(channelId);

function addSeconds(userId, seconds, when = new Date()) {
  const capped = Math.min(Math.floor(seconds), MAX_SESSION_SECONDS);
  if (capped < 1) return;
  botDb.prepare(`
    INSERT INTO voice_time (user_id, week, seconds) VALUES (?, ?, ?)
    ON CONFLICT(user_id, week) DO UPDATE SET seconds = seconds + excluded.seconds
  `).run(userId, weekStart(when), capped);
}

export function startSession(userId, now = Date.now()) {
  if (!sessions.has(userId)) sessions.set(userId, now);
}

export function stopSession(userId, now = Date.now()) {
  const start = sessions.get(userId);
  if (start === undefined) return;
  sessions.delete(userId);
  addSeconds(userId, (now - start) / 1000, new Date(now));
}

/** Enregistre le temps écoulé des sessions en cours sans les interrompre (résiste à un redémarrage). */
export function flushSessions(now = Date.now()) {
  for (const [userId, start] of sessions) {
    addSeconds(userId, (now - start) / 1000, new Date(now));
    sessions.set(userId, now);
  }
}

export function stopAllSessions() {
  for (const userId of [...sessions.keys()]) stopSession(userId);
}

export function activeCount() {
  return sessions.size;
}

/** Temps d'étude de la semaine en cours (secondes) pour un membre, sessions en cours incluses. */
export function weeklySeconds(userId, now = Date.now()) {
  const stored = botDb.prepare("SELECT seconds FROM voice_time WHERE user_id = ? AND week = ?").get(userId, weekStart(new Date(now)));
  const live = sessions.has(userId) ? Math.min((now - sessions.get(userId)) / 1000, MAX_SESSION_SECONDS) : 0;
  return Number(stored?.seconds ?? 0) + Math.floor(live);
}

export function weeklyLeaderboard(limit = 10, now = Date.now()) {
  const rows = botDb.prepare("SELECT user_id, seconds FROM voice_time WHERE week = ?").all(weekStart(new Date(now)));
  const totals = new Map(rows.map((r) => [r.user_id, Number(r.seconds)]));
  for (const [userId, start] of sessions) {
    totals.set(userId, (totals.get(userId) ?? 0) + Math.floor(Math.min((now - start) / 1000, MAX_SESSION_SECONDS)));
  }
  return [...totals].map(([userId, seconds]) => ({ userId, seconds })).sort((a, b) => b.seconds - a.seconds).slice(0, limit);
}
