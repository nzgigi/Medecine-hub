import { NextResponse } from "next/server";
import { countUsers } from "@/lib/server/userStore";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ success: true, users: countUsers() });
}
