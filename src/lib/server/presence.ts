import { getDb } from "./db";
import { getUserBySub } from "./userStore";

/**
 * Présence en ligne, gardée en mémoire du process (le site tourne sur un
 * serveur persistant + SQLite). Chaque navigateur envoie un battement de cœur
 * toutes les ~45 s tant que l'onglet est visible ; on est "en ligne" si le
 * dernier battement date de moins de ONLINE_WINDOW_MS.
 *
 * Rien n'est stocké par visiteur : seuls le pic de connectés par heure et
 * `users.last_seen_at` (membres connectés uniquement) sont persistés.
 */

export const ONLINE_WINDOW_MS = 90_000;

const MAX_ENTRIES = 5000;
const PRUNE_EVERY_MS = 30_000;
const LAST_SEEN_WRITE_EVERY_MS = 5 * 60_000;
const HOURLY_RETENTION_DAYS = 30;

interface PresenceEntry {
  lastSeen: number;
  sub?: string;
  handle?: string;
  name?: string;
  path?: string;
}

interface PresenceState {
  entries: Map<string, PresenceEntry>;
  lastPrune: number;
  lastSeenWrites: Map<string, number>;
  currentHour: string;
  currentHourPeak: number;
}

// globalThis : les routes API et les pages serveur peuvent être bundlées
// séparément, elles doivent pourtant voir le même Map.
const globalForPresence = globalThis as typeof globalThis & {
  __medhubPresence?: PresenceState;
};

function getState(): PresenceState {
  if (!globalForPresence.__medhubPresence) {
    globalForPresence.__medhubPresence = {
      entries: new Map(),
      lastPrune: 0,
      lastSeenWrites: new Map(),
      currentHour: "",
      currentHourPeak: 0,
    };
  }

  return globalForPresence.__medhubPresence;
}

function pruneExpired(state: PresenceState, now: number) {
  if (now - state.lastPrune < PRUNE_EVERY_MS) return;
  state.lastPrune = now;

  for (const [visitorId, entry] of state.entries) {
    if (now - entry.lastSeen > ONLINE_WINDOW_MS) state.entries.delete(visitorId);
  }

  for (const [sub, writtenAt] of state.lastSeenWrites) {
    if (now - writtenAt > LAST_SEEN_WRITE_EVERY_MS) state.lastSeenWrites.delete(sub);
  }
}

function onlineEntries(state: PresenceState, now: number): PresenceEntry[] {
  const online: PresenceEntry[] = [];

  for (const entry of state.entries.values()) {
    if (now - entry.lastSeen <= ONLINE_WINDOW_MS) online.push(entry);
  }

  return online;
}

function hourKey(date: Date) {
  return `${date.toISOString().slice(0, 13)}:00:00.000Z`;
}

function trackHourlyPeak(state: PresenceState, now: number, onlineCount: number) {
  const hour = hourKey(new Date(now));
  const db = getDb();

  if (hour !== state.currentHour) {
    const row = db.prepare(`SELECT peak FROM presence_hourly WHERE hour = ?`).get(hour) as
      | { peak: number }
      | undefined;

    state.currentHour = hour;
    state.currentHourPeak = row?.peak ?? 0;

    const cutoff = new Date(now - HOURLY_RETENTION_DAYS * 86_400_000).toISOString();
    db.prepare(`DELETE FROM presence_hourly WHERE hour < ?`).run(cutoff);
  }

  if (onlineCount > state.currentHourPeak) {
    state.currentHourPeak = onlineCount;
    db.prepare(
      `INSERT INTO presence_hourly (hour, peak) VALUES (?, ?)
       ON CONFLICT(hour) DO UPDATE SET peak = MAX(peak, excluded.peak)`
    ).run(hour, onlineCount);
  }
}

export interface HeartbeatInput {
  visitorId: string;
  sub?: string;
  path?: string;
}

export function recordHeartbeat({ visitorId, sub, path }: HeartbeatInput) {
  const state = getState();
  const now = Date.now();

  pruneExpired(state, now);

  const existing = state.entries.get(visitorId);
  if (!existing && state.entries.size >= MAX_ENTRIES) return;

  const entry: PresenceEntry = { lastSeen: now, path };

  if (sub) {
    if (existing?.sub === sub && existing.handle) {
      entry.sub = existing.sub;
      entry.handle = existing.handle;
      entry.name = existing.name;
    } else {
      // Un `sub` qui n'existe pas en base est traité comme un visiteur anonyme.
      const user = getUserBySub(sub);

      if (user) {
        entry.sub = user.sub;
        entry.handle = user.handle;
        entry.name = user.name;
      }
    }

    if (entry.sub && now - (state.lastSeenWrites.get(entry.sub) ?? 0) > LAST_SEEN_WRITE_EVERY_MS) {
      state.lastSeenWrites.set(entry.sub, now);
      getDb()
        .prepare(`UPDATE users SET last_seen_at = ? WHERE sub = ?`)
        .run(new Date(now).toISOString(), entry.sub);
    }
  }

  state.entries.set(visitorId, entry);
  trackHourlyPeak(state, now, onlineEntries(state, now).length);
}

export function recordLeave(visitorId: string) {
  getState().entries.delete(visitorId);
}

/** Pseudos (handles) des membres actuellement en ligne. */
export function getOnlineHandles(): string[] {
  const state = getState();
  const now = Date.now();
  pruneExpired(state, now);

  const handles = new Set<string>();
  for (const entry of onlineEntries(state, now)) {
    if (entry.handle) handles.add(entry.handle);
  }

  return [...handles];
}

export function isHandleOnline(handle: string): boolean {
  return getOnlineHandles().includes(handle);
}

export interface OnlineSnapshot {
  /** Navigateurs distincts actuellement actifs (membres + anonymes). */
  visitors: number;
  /** Membres distincts en ligne. */
  memberCount: number;
  anonymous: number;
  members: { handle: string; name: string }[];
  /** Pages consultées en ce moment, de la plus fréquentée à la moins fréquentée. */
  pages: { path: string; count: number }[];
}

export function getOnlineSnapshot(): OnlineSnapshot {
  const state = getState();
  const now = Date.now();
  pruneExpired(state, now);

  const online = onlineEntries(state, now);
  const members = new Map<string, { handle: string; name: string }>();
  const pageCounts = new Map<string, number>();

  for (const entry of online) {
    if (entry.sub && entry.handle) {
      members.set(entry.sub, { handle: entry.handle, name: entry.name ?? entry.handle });
    }

    if (entry.path) pageCounts.set(entry.path, (pageCounts.get(entry.path) ?? 0) + 1);
  }

  const memberEntries = online.filter((entry) => entry.sub).length;

  return {
    visitors: online.length,
    memberCount: members.size,
    anonymous: online.length - memberEntries,
    members: [...members.values()].sort((a, b) => a.name.localeCompare(b.name, "fr")),
    pages: [...pageCounts.entries()]
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
  };
}

export interface HourlyPeak {
  hour: string;
  peak: number;
}

/** Pic de connectés simultanés par heure sur les `hours` dernières heures (heures creuses = 0). */
export function getHourlyPeaks(hours = 24): HourlyPeak[] {
  const db = getDb();
  const now = Date.now();
  const currentHourStart = new Date(hourKey(new Date(now))).getTime();
  const slots: HourlyPeak[] = [];

  for (let i = hours - 1; i >= 0; i--) {
    slots.push({ hour: new Date(currentHourStart - i * 3_600_000).toISOString(), peak: 0 });
  }

  const rows = db
    .prepare(`SELECT hour, peak FROM presence_hourly WHERE hour >= ?`)
    .all(slots[0].hour) as unknown as HourlyPeak[];

  const peakByHour = new Map(rows.map((row) => [row.hour, row.peak]));

  return slots.map((slot) => ({ ...slot, peak: peakByHour.get(slot.hour) ?? 0 }));
}
