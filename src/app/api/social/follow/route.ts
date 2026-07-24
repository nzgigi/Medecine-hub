import { NextRequest, NextResponse } from "next/server";
import { getUserByHandle, sanitizeSub } from "@/lib/server/userStore";
import { followUser, unfollowUser } from "@/lib/server/social";
import { recomputeAchievements } from "@/lib/server/socialProfile";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      sub?: unknown;
      targetHandle?: unknown;
      action?: unknown;
    };

    const sub = sanitizeSub(body.sub);

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
