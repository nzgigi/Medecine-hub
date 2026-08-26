import { NextRequest, NextResponse } from "next/server";
import { createQuestionReport } from "@/lib/server/questionReports";
import { getUserBySub, sanitizeSub } from "@/lib/server/userStore";

const MAX_MESSAGE_LENGTH = 1000;
const MAX_QUESTION_TEXT_LENGTH = 2000;

interface ReportBody {
  matiere?: unknown;
  annee?: unknown;
  questionId?: unknown;
  questionText?: unknown;
  message?: unknown;
  sub?: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ReportBody;

    const matiere = typeof body.matiere === "string" ? body.matiere.trim() : "";
    const annee = Number(body.annee);
    const questionId = Number(body.questionId);
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!matiere || !Number.isInteger(annee) || !Number.isInteger(questionId)) {
      return NextResponse.json(
        { success: false, message: "Épreuve ou question invalide" },
        { status: 400 }
      );
    }

    if (!message || message.length < 5) {
      return NextResponse.json(
        { success: false, message: "Merci de décrire le problème (5 caractères minimum)" },
        { status: 400 }
      );
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { success: false, message: "Message trop long" },
        { status: 400 }
      );
    }

    const questionText =
      typeof body.questionText === "string"
        ? body.questionText.trim().slice(0, MAX_QUESTION_TEXT_LENGTH)
        : undefined;

    let userSub: string | undefined;
    let userName: string | undefined;

    if (typeof body.sub === "string" && body.sub.trim()) {
      try {
        userSub = sanitizeSub(body.sub);
        userName = getUserBySub(userSub)?.name;
      } catch {
        userSub = undefined;
      }
    }

    createQuestionReport({
      matiere,
      annee,
      questionId,
      questionText,
      message,
      userSub,
      userName,
    });

    return NextResponse.json({ success: true });
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
