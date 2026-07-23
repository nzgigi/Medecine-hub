import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/server/security";
import { readAdminLogs } from "@/lib/server/adminLog";

export async function GET(request: NextRequest) {
  const unauthorized = requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  return NextResponse.json({ success: true, logs: readAdminLogs() });
}
