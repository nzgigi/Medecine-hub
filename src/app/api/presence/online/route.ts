import { NextResponse } from "next/server";
import { getOnlineHandles } from "@/lib/server/presence";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { success: true, handles: getOnlineHandles() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
