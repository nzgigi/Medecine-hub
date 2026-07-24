import { NextRequest, NextResponse } from "next/server";
import { sanitizeSub } from "@/lib/server/userStore";
import { getFeedForUser } from "@/lib/server/social";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sub = sanitizeSub(searchParams.get("sub"));

    return NextResponse.json({ success: true, events: getFeedForUser(sub) });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Erreur serveur",
      },
      { status: 400 }
    );
  }
}
