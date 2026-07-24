import fs from "fs";
import { getDb } from "./db";
import { safeJoinInside } from "./security";
import { getUserByHandle, getUserBySub, type StoredUser } from "./userStore";
import {
  ACHIEVEMENTS_BY_KEY,
  computeEarnedAchievementKeys,
  type UserStatsForAchievements,
} from "@/lib/achievements";

interface QcmIndexEntry {
  matiere: string;
  slug: string;
  annee: number;
  total_questions: number;
}

interface IncomingAttempt {
  matiere?: unknown;
  annee?: unknown;
  score?: unknown;
  total?: unknown;
  date?: unknown;
}

let qcmIndexCache: QcmIndexEntry[] | null = null;

function loadQcmIndex(): QcmIndexEntry[] {
  if (qcmIndexCache) return qcmIndexCache;

  try {
    const indexPath = safeJoinInside(process.cwd(), "public", "data", "qcm", "index.json");
    qcmIndexCache = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as QcmIndexEntry[];
  } catch {
    qcmIndexCache = [];
  }

  return qcmIndexCache;
}

function totalMatieresAvailable(): number {
  return new Set(loadQcmIndex().map((entry) => entry.matiere)).size;
}

function findRealQuestionsCount(matiere: string, annee: number): number | null {
  const entry = loadQcmIndex().find(
    (item) => item.matiere === matiere && item.annee === annee
  );

  return entry?.total_questions ?? null;
}

function sanitizeAttempt(raw: IncomingAttempt) {
  if (typeof raw.matiere !== "string" || !raw.matiere.trim()) return null;

  const annee = Number(raw.annee);
  const score = Number(raw.score);
  const total = Number(raw.total);

  if (!Number.isInteger(annee) || annee < 2000 || annee > 2100) return null;
  if (!Number.isFinite(score) || score < 0 || score > 20) return null;
  if (!Number.isFinite(total) || total <= 0 || total > 20) return null;
  if (score > total) return null;

  const dateValue = typeof raw.date === "string" ? new Date(raw.date) : null;
  if (!dateValue || Number.isNaN(dateValue.getTime())) return null;
  if (dateValue.getTime() > Date.now() + 60_000) return null; // pas dans le futur

  return {
    matiere: raw.matiere.trim(),
    annee,
    score: Math.round(score),
    total: Math.round(total),
    completedAt: dateValue.toISOString(),
  };
}

export interface RecordAttemptsResult {
  inserted: number;
  newlyEarnedAchievementKeys: string[];
}

export function recordQcmAttempts(sub: string, rawAttempts: unknown[]): RecordAttemptsResult {
  const db = getDb();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO qcm_attempts
      (user_sub, matiere, annee, score, total, questions_count, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  let inserted = 0;

  for (const rawItem of Array.isArray(rawAttempts) ? rawAttempts : []) {
    const attempt = sanitizeAttempt((rawItem ?? {}) as IncomingAttempt);
    if (!attempt) continue;

    const questionsCount = findRealQuestionsCount(attempt.matiere, attempt.annee);

    const result = insert.run(
      sub,
      attempt.matiere,
      attempt.annee,
      attempt.score,
      attempt.total,
      questionsCount,
      attempt.completedAt
    );

    if (result.changes > 0) inserted++;
  }

  const newlyEarnedAchievementKeys = recomputeAchievements(sub);

  return { inserted, newlyEarnedAchievementKeys };
}

function getStatsForAchievements(sub: string): UserStatsForAchievements {
  const db = getDb();

  const totals = db
    .prepare(
      `SELECT
        COUNT(*) AS totalAttempts,
        COUNT(DISTINCT matiere) AS distinctMatieres,
        SUM(CASE WHEN total > 0 AND score = total THEN 1 ELSE 0 END) AS perfectScores,
        COALESCE(MAX(CASE WHEN total > 0 THEN (score * 100.0 / total) END), 0) AS bestScorePercent,
        COALESCE(AVG(CASE WHEN total > 0 THEN (score * 100.0 / total) END), 0) AS avgScorePercent,
        COALESCE(SUM(questions_count), 0) AS totalQuestionsAnswered,
        COUNT(DISTINCT substr(completed_at, 1, 10)) AS distinctActiveDays
      FROM qcm_attempts WHERE user_sub = ?`
    )
    .get(sub) as {
    totalAttempts: number;
    distinctMatieres: number;
    perfectScores: number;
    bestScorePercent: number;
    avgScorePercent: number;
    totalQuestionsAnswered: number;
    distinctActiveDays: number;
  };

  return {
    totalAttempts: Number(totals.totalAttempts) || 0,
    distinctMatieres: Number(totals.distinctMatieres) || 0,
    totalMatieresAvailable: totalMatieresAvailable(),
    perfectScores: Number(totals.perfectScores) || 0,
    bestScorePercent: Number(totals.bestScorePercent) || 0,
    avgScorePercent: Number(totals.avgScorePercent) || 0,
    totalQuestionsAnswered: Number(totals.totalQuestionsAnswered) || 0,
    distinctActiveDays: Number(totals.distinctActiveDays) || 0,
  };
}

function recomputeAchievements(sub: string): string[] {
  const db = getDb();
  const stats = getStatsForAchievements(sub);
  const earnedKeys = computeEarnedAchievementKeys(stats);

  const alreadyEarned = new Set(
    (
      db
        .prepare(`SELECT achievement_key FROM user_achievements WHERE user_sub = ?`)
        .all(sub) as { achievement_key: string }[]
    ).map((row) => row.achievement_key)
  );

  const newlyEarned = earnedKeys.filter((key) => !alreadyEarned.has(key));

  if (newlyEarned.length > 0) {
    const now = new Date().toISOString();
    const insertAchievement = db.prepare(
      `INSERT OR IGNORE INTO user_achievements (user_sub, achievement_key, earned_at) VALUES (?, ?, ?)`
    );

    for (const key of newlyEarned) {
      insertAchievement.run(sub, key, now);
    }
  }

  return newlyEarned;
}

export interface EarnedAchievement {
  key: string;
  title: string;
  description: string;
  icon: string;
  earnedAt: string;
}

export function getUserAchievements(sub: string): EarnedAchievement[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT achievement_key, earned_at FROM user_achievements WHERE user_sub = ? ORDER BY earned_at ASC`
    )
    .all(sub) as { achievement_key: string; earned_at: string }[];

  return rows
    .map((row) => {
      const definition = ACHIEVEMENTS_BY_KEY[row.achievement_key];
      if (!definition) return null;

      return {
        key: definition.key,
        title: definition.title,
        description: definition.description,
        icon: definition.icon,
        earnedAt: row.earned_at,
      };
    })
    .filter((item): item is EarnedAchievement => item !== null);
}

export interface PublicProfileStats {
  totalAttempts: number;
  distinctMatieres: number;
  bestScorePercent: number;
  avgScorePercent: number;
  perfectScores: number;
}

export interface PublicProfile {
  handle: string;
  name: string;
  picture?: string;
  avatarPath?: string;
  role: StoredUser["role"];
  memberSince: string;
  stats: PublicProfileStats;
  achievements: EarnedAchievement[];
}

function toPublicProfile(user: StoredUser): PublicProfile {
  const stats = getStatsForAchievements(user.sub);

  return {
    handle: user.handle,
    name: user.name,
    picture: user.picture,
    avatarPath: user.avatarPath,
    role: user.role,
    memberSince: user.firstSeenAt,
    stats: {
      totalAttempts: stats.totalAttempts,
      distinctMatieres: stats.distinctMatieres,
      bestScorePercent: Math.round(stats.bestScorePercent),
      avgScorePercent: Math.round(stats.avgScorePercent),
      perfectScores: stats.perfectScores,
    },
    achievements: getUserAchievements(user.sub),
  };
}

export function getPublicProfileByHandle(handle: string): PublicProfile | null {
  const user = getUserByHandle(handle);
  return user ? toPublicProfile(user) : null;
}

export function getPublicProfileBySub(sub: string): PublicProfile | null {
  const user = getUserBySub(sub);
  return user ? toPublicProfile(user) : null;
}
