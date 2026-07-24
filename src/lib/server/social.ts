import { getDb } from "./db";
import { getUserBySub, getUserByHandle, type StoredUser } from "./userStore";

export function recordActivityEvent(
  sub: string,
  type: string,
  payload?: Record<string, unknown>
) {
  const db = getDb();

  db.prepare(
    `INSERT INTO activity_events (user_sub, type, payload, created_at) VALUES (?, ?, ?, ?)`
  ).run(sub, type, payload ? JSON.stringify(payload) : null, new Date().toISOString());
}

export interface FollowResult {
  success: boolean;
  message?: string;
  following?: boolean;
}

export function followUser(followerSub: string, targetHandle: string): FollowResult {
  const follower = getUserBySub(followerSub);
  const target = getUserByHandle(targetHandle);

  if (!follower) return { success: false, message: "Utilisateur inconnu — reconnectez-vous" };
  if (!target) return { success: false, message: "Profil introuvable" };
  if (follower.sub === target.sub) {
    return { success: false, message: "Impossible de s'abonner à soi-même" };
  }

  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO follows (follower_sub, followee_sub, created_at) VALUES (?, ?, ?)`
  ).run(follower.sub, target.sub, new Date().toISOString());

  return { success: true, following: true };
}

export function unfollowUser(followerSub: string, targetHandle: string): FollowResult {
  const target = getUserByHandle(targetHandle);
  if (!target) return { success: false, message: "Profil introuvable" };

  const db = getDb();
  db.prepare(`DELETE FROM follows WHERE follower_sub = ? AND followee_sub = ?`).run(
    followerSub,
    target.sub
  );

  return { success: true, following: false };
}

export function isFollowing(followerSub: string, followeeSub: string): boolean {
  const db = getDb();
  const row = db
    .prepare(`SELECT 1 FROM follows WHERE follower_sub = ? AND followee_sub = ?`)
    .get(followerSub, followeeSub);

  return Boolean(row);
}

export interface FollowCounts {
  followers: number;
  following: number;
}

export function getFollowCounts(sub: string): FollowCounts {
  const db = getDb();

  const followers = db
    .prepare(`SELECT COUNT(*) AS count FROM follows WHERE followee_sub = ?`)
    .get(sub) as { count: number };

  const following = db
    .prepare(`SELECT COUNT(*) AS count FROM follows WHERE follower_sub = ?`)
    .get(sub) as { count: number };

  return { followers: followers.count, following: following.count };
}

export interface FollowListEntry {
  handle: string;
  name: string;
  picture?: string;
  avatarPath?: string;
  role: StoredUser["role"];
}

function rowsToFollowList(subs: string[]): FollowListEntry[] {
  return subs
    .map((sub) => getUserBySub(sub))
    .filter((user): user is StoredUser => user !== null)
    .map((user) => ({
      handle: user.handle,
      name: user.name,
      picture: user.picture,
      avatarPath: user.avatarPath,
      role: user.role,
    }));
}

export function getFollowers(sub: string): FollowListEntry[] {
  const db = getDb();
  const rows = db
    .prepare(`SELECT follower_sub FROM follows WHERE followee_sub = ? ORDER BY created_at DESC`)
    .all(sub) as { follower_sub: string }[];

  return rowsToFollowList(rows.map((row) => row.follower_sub));
}

export function getFollowing(sub: string): FollowListEntry[] {
  const db = getDb();
  const rows = db
    .prepare(`SELECT followee_sub FROM follows WHERE follower_sub = ? ORDER BY created_at DESC`)
    .all(sub) as { followee_sub: string }[];

  return rowsToFollowList(rows.map((row) => row.followee_sub));
}

export interface FeedEvent {
  type: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
  actor: {
    handle: string;
    name: string;
    picture?: string;
    avatarPath?: string;
  };
}

const FEED_LIMIT = 50;

export function getFeedForUser(sub: string): FeedEvent[] {
  const db = getDb();

  const rows = db
    .prepare(
      `SELECT e.type, e.payload, e.created_at, u.sub AS actor_sub, u.handle, u.name, u.picture, u.avatar_path
       FROM activity_events e
       JOIN follows f ON f.followee_sub = e.user_sub
       JOIN users u ON u.sub = e.user_sub
       WHERE f.follower_sub = ?
       ORDER BY e.created_at DESC
       LIMIT ?`
    )
    .all(sub, FEED_LIMIT) as {
    type: string;
    payload: string | null;
    created_at: string;
    actor_sub: string;
    handle: string;
    name: string;
    picture: string | null;
    avatar_path: string | null;
  }[];

  return rows.map((row) => ({
    type: row.type,
    payload: row.payload ? (JSON.parse(row.payload) as Record<string, unknown>) : null,
    createdAt: row.created_at,
    actor: {
      handle: row.handle,
      name: row.name,
      picture: row.picture ?? undefined,
      avatarPath: row.avatar_path ?? undefined,
    },
  }));
}
