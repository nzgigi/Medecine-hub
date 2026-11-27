import fs from "fs";
import { getDb } from "./db";
import { safeJoinInside } from "./security";
import { getUserBySub } from "./userStore";
import { ACHIEVEMENTS_BY_KEY } from "../achievements";

/**
 * Les notifications ne sont pas stockées : elles sont déduites à la lecture des
 * données existantes (journal des mises à jour, signalements, abonnements,
 * succès). Seul l'état « lu » est enregistré. Un signalement résolu depuis le
 * panneau admin ou depuis le bot Discord est donc notifié de la même façon.
 */

export type NotificationType = "mise_a_jour" | "signalement" | "abonne" | "succes";

export interface AppNotification {
  key: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string | null;
  date: string;
  read: boolean;
}

type PendingNotification = Omit<AppNotification, "read">;

interface ChangelogEntry {
  id: string;
  date: string;
  title: string;
}

const MAX_AGE_DAYS = 30;
const MAX_NOTIFICATIONS = 20;

function readChangelog(): ChangelogEntry[] {
  try {
    const file = safeJoinInside(process.cwd(), "public", "data", "changelog.json");
    return JSON.parse(fs.readFileSync(file, "utf-8")) as ChangelogEntry[];
  } catch {
    return [];
  }
}

function collectNotifications(sub: string): PendingNotification[] {
  const user = getUserBySub(sub);
  if (!user) return [];

  const db = getDb();
  const oldest = new Date(Date.now() - MAX_AGE_DAYS * 86_400_000).toISOString();
  // Rien d'antérieur à l'inscription : un nouveau compte n'hérite pas de l'historique.
  const since = user.firstSeenAt > oldest ? user.firstSeenAt : oldest;
  const sinceDay = since.slice(0, 10);

  const updates: PendingNotification[] = readChangelog()
    .filter((entry) => entry.date >= sinceDay)
    .map((entry) => ({
      key: `maj:${entry.id}`,
      type: "mise_a_jour",
      title: "Nouvelle mise à jour",
      message: entry.title,
      href: "/mises-a-jour",
      date: entry.date,
    }));

  const reportRows = db
    .prepare(
      `SELECT id, matiere, annee, question_id, resolved_at FROM question_reports
       WHERE user_sub = ? AND status = 'resolu' AND resolved_at >= ?`
    )
    .all(sub, since) as {
    id: number;
    matiere: string;
    annee: number;
    question_id: number;
    resolved_at: string;
  }[];

  const reports: PendingNotification[] = reportRows.map((row) => ({
    key: `signalement:${row.id}:${row.resolved_at}`,
    type: "signalement",
    title: "Signalement traité",
    message: `Ton signalement sur la question ${row.question_id} (${row.matiere} ${row.annee}) est résolu. Merci !`,
    href: null,
    date: row.resolved_at,
  }));

  const followerRows = db
    .prepare(
      `SELECT u.handle, u.name, f.created_at FROM follows f
       JOIN users u ON u.sub = f.follower_sub
       WHERE f.followee_sub = ? AND f.created_at >= ?`
    )
    .all(sub, since) as { handle: string; name: string; created_at: string }[];

  const followers: PendingNotification[] = followerRows.map((row) => ({
    key: `abonne:${row.handle}:${row.created_at}`,
    type: "abonne",
    title: "Nouvel abonné",
    message: `${row.name} s'est abonné(e) à ton profil.`,
    href: `/profil/${row.handle}`,
    date: row.created_at,
  }));

  const achievementRows = db
    .prepare(
      `SELECT achievement_key, earned_at FROM user_achievements
       WHERE user_sub = ? AND earned_at >= ?`
    )
    .all(sub, since) as { achievement_key: string; earned_at: string }[];

  const achievements: PendingNotification[] = achievementRows.flatMap((row) => {
    const definition = ACHIEVEMENTS_BY_KEY[row.achievement_key];
    if (!definition) return [];

    return [
      {
        key: `succes:${row.achievement_key}`,
        type: "succes" as const,
        title: "Succès débloqué",
        message: definition.title,
        href: `/profil/${user.handle}`,
        date: row.earned_at,
      },
    ];
  });

  return [...updates, ...reports, ...followers, ...achievements]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX_NOTIFICATIONS);
}

export function getNotifications(sub: string): AppNotification[] {
  const rows = getDb()
    .prepare(`SELECT notification_key FROM notification_reads WHERE user_sub = ?`)
    .all(sub) as { notification_key: string }[];
  const readKeys = new Set(rows.map((row) => row.notification_key));

  return collectNotifications(sub).map((item) => ({ ...item, read: readKeys.has(item.key) }));
}

/** Marque comme lues les clés demandées qui font bien partie des notifications du compte. */
export function markNotificationsRead(sub: string, keys: unknown[]): void {
  const requested = new Set(keys);
  const insert = getDb().prepare(
    `INSERT OR IGNORE INTO notification_reads (user_sub, notification_key, read_at) VALUES (?, ?, ?)`
  );
  const now = new Date().toISOString();

  for (const item of collectNotifications(sub)) {
    if (requested.has(item.key)) insert.run(sub, item.key, now);
  }
}
