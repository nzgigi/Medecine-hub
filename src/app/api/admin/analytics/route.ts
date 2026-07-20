import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { requireAdminRequest, safeJoinInside } from "@/lib/server/security";

interface PathStats {
  total: number;
  byDay: Record<string, number>;
}

type ViewsStore = Record<string, PathStats>;

const DAYS_IN_SERIES = 14;

function readStore(): ViewsStore {
  const dir = safeJoinInside(process.cwd(), "data", "analytics");
  const storePath = safeJoinInside(dir, "views.json");

  if (!fs.existsSync(storePath)) return {};

  try {
    return JSON.parse(fs.readFileSync(storePath, "utf-8")) as ViewsStore;
  } catch {
    return {};
  }
}

function getLastDays(count: number): string[] {
  const days: string[] = [];
  const now = new Date();

  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    days.push(date.toISOString().slice(0, 10));
  }

  return days;
}

export async function GET(request: NextRequest) {
  const unauthorized = requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  const store = readStore();
  const paths = Object.entries(store);

  const totalViews = paths.reduce((acc, [, stats]) => acc + stats.total, 0);

  const topPages = [...paths]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)
    .map(([path, stats]) => ({ path, total: stats.total }));

  const days = getLastDays(DAYS_IN_SERIES);
  const dailySeries = days.map((day) => ({
    day,
    total: paths.reduce((acc, [, stats]) => acc + (stats.byDay[day] ?? 0), 0),
  }));

  return NextResponse.json({
    success: true,
    totalViews,
    trackedPaths: paths.length,
    topPages,
    dailySeries,
  });
}
