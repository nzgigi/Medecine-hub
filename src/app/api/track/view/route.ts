import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { safeJoinInside } from "@/lib/server/security";

const MAX_PATH_LENGTH = 200;
const MAX_TRACKED_PATHS = 1000;
const MAX_DAY_ENTRIES_PER_PATH = 90;

interface PathStats {
  total: number;
  byDay: Record<string, number>;
}

type ViewsStore = Record<string, PathStats>;

function getStorePath() {
  const dir = safeJoinInside(process.cwd(), "data", "analytics");

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return safeJoinInside(dir, "views.json");
}

function readStore(): ViewsStore {
  const storePath = getStorePath();

  if (!fs.existsSync(storePath)) return {};

  try {
    return JSON.parse(fs.readFileSync(storePath, "utf-8")) as ViewsStore;
  } catch {
    return {};
  }
}

function pruneOldDays(stats: PathStats) {
  const days = Object.keys(stats.byDay).sort();

  if (days.length <= MAX_DAY_ENTRIES_PER_PATH) return;

  const toRemove = days.slice(0, days.length - MAX_DAY_ENTRIES_PER_PATH);
  for (const day of toRemove) {
    delete stats.byDay[day];
  }
}

function sanitizePath(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.length > MAX_PATH_LENGTH) {
    return null;
  }

  return trimmed;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { path?: unknown };
    const path = sanitizePath(body.path);

    if (!path || path.startsWith("/admin")) {
      return NextResponse.json({ success: true, ignored: true });
    }

    const store = readStore();
    const today = new Date().toISOString().slice(0, 10);

    if (!store[path] && Object.keys(store).length >= MAX_TRACKED_PATHS) {
      return NextResponse.json({ success: true, ignored: true });
    }

    const stats = store[path] ?? { total: 0, byDay: {} };
    stats.total += 1;
    stats.byDay[today] = (stats.byDay[today] ?? 0) + 1;
    pruneOldDays(stats);
    store[path] = stats;

    fs.writeFileSync(getStorePath(), JSON.stringify(store, null, 2), "utf-8");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur tracking vue:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
