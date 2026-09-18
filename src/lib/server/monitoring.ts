import fs from "fs";
import { getDb } from "./db";
import { lastParisDays, parisDay } from "./days";
import { safeJoinInside } from "./security";
import { getHourlyPeaks, getOnlineHandles, getOnlineSnapshot } from "./presence";

const DAYS_IN_SERIES = 30;
const DAY_MS = 86_400_000;

interface PathStats {
  total: number;
  byDay: Record<string, number>;
}

function readViewsStore(): Record<string, PathStats> {
  const storePath = safeJoinInside(process.cwd(), "data", "analytics", "views.json");

  if (!fs.existsSync(storePath)) return {};

  try {
    return JSON.parse(fs.readFileSync(storePath, "utf-8")) as Record<string, PathStats>;
  } catch {
    return {};
  }
}

function countByDay(isoDates: string[], days: string[]) {
  const counts = new Map(days.map((day) => [day, 0]));

  for (const iso of isoDates) {
    const day = parisDay(new Date(iso));
    if (counts.has(day)) counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  return days.map((day) => ({ day, total: counts.get(day) ?? 0 }));
}

function fileSize(...segments: string[]) {
  try {
    return fs.statSync(safeJoinInside(process.cwd(), ...segments)).size;
  } catch {
    return 0;
  }
}

function toMb(bytes: number) {
  return Math.round((bytes / 1024 / 1024) * 10) / 10;
}

export function getMonitoringData() {
  const db = getDb();
  const days = lastParisDays(DAYS_IN_SERIES);
  const now = Date.now();
  const weekAgoIso = new Date(now - 7 * DAY_MS).toISOString();
  const seriesStartIso = new Date(now - (DAYS_IN_SERIES + 1) * DAY_MS).toISOString();

  // Vues du site (compteur simple, sans suivi individuel)
  const viewPaths = Object.entries(readViewsStore());
  const views = {
    total: viewPaths.reduce((acc, [, stats]) => acc + stats.total, 0),
    trackedPaths: viewPaths.length,
    today: viewPaths.reduce((acc, [, stats]) => acc + (stats.byDay[days[days.length - 1]] ?? 0), 0),
    topPages: [...viewPaths]
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10)
      .map(([path, stats]) => ({ path, total: stats.total })),
    daily: days.map((day) => ({
      day,
      total: viewPaths.reduce((acc, [, stats]) => acc + (stats.byDay[day] ?? 0), 0),
    })),
  };

  // Membres
  const onlineHandles = new Set(getOnlineHandles());
  const userRows = db
    .prepare(`SELECT handle, name, role, first_seen_at, last_seen_at FROM users`)
    .all() as {
    handle: string;
    name: string;
    role: string;
    first_seen_at: string;
    last_seen_at: string;
  }[];

  const members = {
    total: userRows.length,
    newThisWeek: userRows.filter((row) => row.first_seen_at >= weekAgoIso).length,
    activeThisWeek: userRows.filter((row) => row.last_seen_at >= weekAgoIso).length,
    signupsDaily: countByDay(
      userRows.filter((row) => row.first_seen_at >= seriesStartIso).map((row) => row.first_seen_at),
      days
    ),
    recent: [...userRows]
      .sort((a, b) => b.last_seen_at.localeCompare(a.last_seen_at))
      .slice(0, 8)
      .map((row) => ({
        handle: row.handle,
        name: row.name,
        role: row.role,
        lastSeenAt: row.last_seen_at,
        online: onlineHandles.has(row.handle),
      })),
  };

  // Activité QCM / MedTok
  const attemptTotals = db
    .prepare(
      `SELECT COUNT(*) AS total,
              COALESCE(AVG(CASE WHEN total > 0 THEN score * 100.0 / total END), 0) AS avgPercent
       FROM qcm_attempts`
    )
    .get() as { total: number; avgPercent: number };

  const recentAttempts = db
    .prepare(`SELECT completed_at FROM qcm_attempts WHERE completed_at >= ?`)
    .all(seriesStartIso) as { completed_at: string }[];

  const medtok = db
    .prepare(`SELECT COALESCE(SUM(total_answered), 0) AS answered FROM medtok_stats`)
    .get() as { answered: number };

  const activity = {
    totalAttempts: Number(attemptTotals.total) || 0,
    avgScorePercent: Math.round(Number(attemptTotals.avgPercent) || 0),
    attemptsThisWeek: recentAttempts.filter((row) => row.completed_at >= weekAgoIso).length,
    medtokAnswered: Number(medtok.answered) || 0,
    attemptsDaily: countByDay(
      recentAttempts.map((row) => row.completed_at),
      days
    ),
  };

  const openReports = db
    .prepare(`SELECT COUNT(*) AS count FROM question_reports WHERE status = 'nouveau'`)
    .get() as { count: number };

  const memory = process.memoryUsage();

  return {
    generatedAt: new Date(now).toISOString(),
    live: { ...getOnlineSnapshot(), hourly: getHourlyPeaks(24) },
    views,
    members,
    activity,
    openReports: Number(openReports.count) || 0,
    system: {
      uptimeSeconds: Math.round(process.uptime()),
      memoryMb: toMb(memory.rss),
      heapUsedMb: toMb(memory.heapUsed),
      dbSizeMb: toMb(fileSize("data", "db", "medecine-hub.sqlite3")),
      nodeVersion: process.version,
    },
  };
}

export type MonitoringData = ReturnType<typeof getMonitoringData>;
