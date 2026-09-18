import { NextResponse } from "next/server";
import { DISCORD_INVITE_CODE } from "@/lib/site";

export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 10 * 60_000;
const ERROR_TTL_MS = 2 * 60_000;

interface DiscordStats {
  members: number;
  online: number;
}

// Un seul appel à Discord toutes les 10 minutes, quel que soit le nombre de visiteurs.
let cache: { fetchedAt: number; ttl: number; stats: DiscordStats | null } | null = null;

async function fetchStats(): Promise<DiscordStats | null> {
  try {
    const response = await fetch(
      `https://discord.com/api/v9/invites/${DISCORD_INVITE_CODE}?with_counts=true`,
      { cache: "no-store", signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) return null;

    const invite = (await response.json()) as {
      approximate_member_count?: unknown;
      approximate_presence_count?: unknown;
    };

    if (
      typeof invite.approximate_member_count !== "number" ||
      typeof invite.approximate_presence_count !== "number"
    ) {
      return null;
    }

    return {
      members: invite.approximate_member_count,
      online: invite.approximate_presence_count,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const now = Date.now();

  if (!cache || now - cache.fetchedAt > cache.ttl) {
    const stats = await fetchStats();
    cache = { fetchedAt: now, ttl: stats ? CACHE_TTL_MS : ERROR_TTL_MS, stats };
  }

  return NextResponse.json(
    cache.stats ? { success: true, ...cache.stats } : { success: false },
    { headers: { "Cache-Control": "public, max-age=300" } }
  );
}
