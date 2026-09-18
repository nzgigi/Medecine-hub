import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/server/security";
import { getMonitoringData } from "@/lib/server/monitoring";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const unauthorized = requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  try {
    return NextResponse.json(
      { success: true, ...getMonitoringData() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Erreur monitoring:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
