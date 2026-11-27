import { NextRequest, NextResponse } from "next/server";
import { getUserByHandle } from "@/lib/server/userStore";
import { getSessionSub } from "@/lib/server/universityAuth";
import { isFollowing } from "@/lib/server/social";

export async function GET(req: NextRequest) {
  try {
    const sub = getSessionSub(req);
    if (!sub) {
      return NextResponse.json({ success: false, message: "Connexion requise" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetHandle = searchParams.get("targetHandle");

    if (!targetHandle) {
      return NextResponse.json(
        { success: false, message: "Profil cible manquant" },
        { status: 400 }
      );
    }

    const target = getUserByHandle(targetHandle);
    if (!target) {
      return NextResponse.json({ success: false, message: "Profil introuvable" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      following: isFollowing(sub, target.sub),
      isSelf: sub === target.sub,
    });
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
