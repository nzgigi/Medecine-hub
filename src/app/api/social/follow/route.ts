import { NextRequest, NextResponse } from "next/server";
import { getUserByHandle } from "@/lib/server/userStore";
import { getSessionSub } from "@/lib/server/universityAuth";
import { followUser, unfollowUser } from "@/lib/server/social";
import { recomputeAchievements } from "@/lib/server/socialProfile";

export async function POST(req: NextRequest) {
  try {
    const sub = getSessionSub(req);
    if (!sub) {
      return NextResponse.json({ success: false, message: "Connexion requise" }, { status: 401 });
    }

    const body = (await req.json()) as {
      targetHandle?: unknown;
      action?: unknown;
    };

    if (typeof body.targetHandle !== "string" || !body.targetHandle.trim()) {
      return NextResponse.json(
        { success: false, message: "Profil cible manquant" },
        { status: 400 }
      );
    }

    const targetHandle = body.targetHandle.trim();
    const result =
      body.action === "unfollow"
        ? unfollowUser(sub, targetHandle)
        : followUser(sub, targetHandle);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    if (body.action !== "unfollow") {
      const target = getUserByHandle(targetHandle);
      if (target) recomputeAchievements(target.sub);
      recomputeAchievements(sub);
    }

    return NextResponse.json(result);
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
