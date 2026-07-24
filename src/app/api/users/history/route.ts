import { NextRequest, NextResponse } from "next/server";
import { getUserBySub, sanitizeSub } from "@/lib/server/userStore";
import { recordQcmAttempts, getPublicProfileBySub } from "@/lib/server/socialProfile";

const MAX_ATTEMPTS_PER_REQUEST = 500;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { sub?: unknown; attempts?: unknown };
    const sub = sanitizeSub(body.sub);

    if (!getUserBySub(sub)) {
      return NextResponse.json(
        { success: false, message: "Utilisateur inconnu — reconnectez-vous" },
        { status: 404 }
      );
    }

    const attempts = Array.isArray(body.attempts)
      ? body.attempts.slice(0, MAX_ATTEMPTS_PER_REQUEST)
      : [];

    const { inserted, newlyEarnedAchievementKeys } = recordQcmAttempts(sub, attempts);
    const profile = getPublicProfileBySub(sub);

    return NextResponse.json({
      success: true,
      inserted,
      newlyEarnedAchievementKeys,
      profile,
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
