import { NextRequest, NextResponse } from "next/server";
import { getUserBySub, sanitizeSub } from "@/lib/server/userStore";
import { recordMedtokProgress } from "@/lib/server/socialProfile";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      sub?: unknown;
      answered?: unknown;
      correct?: unknown;
      bestStreak?: unknown;
    };

    const sub = sanitizeSub(body.sub);

    if (!getUserBySub(sub)) {
      return NextResponse.json(
        { success: false, message: "Utilisateur inconnu — reconnectez-vous" },
        { status: 404 }
      );
    }

    const answered = Number(body.answered) || 0;
    const correct = Number(body.correct) || 0;
    const bestStreak = Number(body.bestStreak) || 0;

    const { newlyEarnedAchievementKeys } = recordMedtokProgress(sub, {
      answered,
      correct,
      bestStreak,
    });

    return NextResponse.json({ success: true, newlyEarnedAchievementKeys });
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
