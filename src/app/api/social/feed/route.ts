import { NextRequest, NextResponse } from "next/server";
import { getSessionSub } from "@/lib/server/universityAuth";
import { getFeedForUser } from "@/lib/server/social";

export async function GET(req: NextRequest) {
  try {
    const sub = getSessionSub(req);
    if (!sub) {
      return NextResponse.json({ success: false, message: "Connexion requise" }, { status: 401 });
    }

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
