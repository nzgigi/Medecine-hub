import { TZ } from "./config.js";

const partsFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

/** Date et heure "murales" à Paris : { ymd: "2026-09-19", hour: 18, minute: 0 }. */
export function parisNow(date = new Date()) {
  const p = Object.fromEntries(partsFmt.formatToParts(date).map((x) => [x.type, x.value]));
  return { ymd: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour), minute: Number(p.minute) };
}

/** Lundi (YYYY-MM-DD) de la semaine de la date donnée, à Paris. */
export function weekStart(date = new Date()) {
  const { ymd } = parisNow(date);
  const d = new Date(`${ymd}T00:00:00Z`);
  const offset = (d.getUTCDay() + 6) % 7; // lundi = 0
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

export function addDays(ymd, delta) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function truncate(text, max) {
  const s = String(text ?? "");
  return s.length <= max ? s : `${s.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/** 5400 → "1 h 30", 600 → "10 min", 30 → "< 1 min". */
export function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) return "< 1 min";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

export const MEDALS = ["🥇", "🥈", "🥉"];

export function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function normalize(text) {
  return String(text ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** Durée écoulée lisible : "3 jours", "5 h", "12 min". */
export function ago(date, now = Date.now()) {
  const s = Math.max(0, Math.floor((now - new Date(date).getTime()) / 1000));
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  const d = Math.floor(s / 86400);
  return `${d} jour${d > 1 ? "s" : ""}`;
}
