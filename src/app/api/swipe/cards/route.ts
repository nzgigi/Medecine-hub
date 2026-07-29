import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { ExamData, LegacyQCMData } from "@/types/exam";
import { normalizeExamData, flattenExamQuestions } from "@/lib/exam/normalizeExam";

export interface SwipeCard {
  id: string;
  matiere: string;
  slug: string;
  annee: number;
  questionType: string;
  contexte?: string;
  question: string;
  proposition: string;
  letter: string;
  isTrue: boolean;
  correctionExplanation?: string;
}

const QCM_DIR = path.join(process.cwd(), "public", "data", "qcm");
const FILENAME_PATTERN = /^(.+)_(\d{4})\.json$/;

function stripLetterPrefix(choice: string) {
  return choice.replace(/^[A-Za-z][).:]\s*/, "").trim();
}

function buildCardsFromExam(exam: ExamData, slug: string): SwipeCard[] {
  const questions = flattenExamQuestions(exam);
  const cards: SwipeCard[] = [];

  questions.forEach((question) => {
    if (question.type === "QROC") return;

    question.choix.forEach((choice) => {
      const letter = choice.charAt(0);

      cards.push({
        id: `${slug}-${exam.annee}-${question.id}-${letter}`,
        matiere: exam.matiere,
        slug,
        annee: exam.annee,
        questionType: question.type,
        contexte: question.contexte,
        question: question.question,
        proposition: stripLetterPrefix(choice),
        letter,
        isTrue: question.reponses.includes(letter),
        correctionExplanation: question.correctionExplanation,
      });
    });
  });

  return cards;
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const matiereFilter = searchParams.get("matiere");
  const limitParam = Number(searchParams.get("limit"));
  const limit =
    Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(limitParam, 150)
      : 50;

  if (!fs.existsSync(QCM_DIR)) {
    return NextResponse.json({ cards: [], total: 0 });
  }

  const files = fs.readdirSync(QCM_DIR).filter((file) => file !== "index.json");

  let allCards: SwipeCard[] = [];

  for (const file of files) {
    const match = file.match(FILENAME_PATTERN);
    if (!match) continue;

    const [, slug] = match;

    if (matiereFilter && matiereFilter !== "all" && slug !== matiereFilter) {
      continue;
    }

    try {
      const raw = fs.readFileSync(path.join(QCM_DIR, file), "utf-8");
      const data = JSON.parse(raw) as ExamData | LegacyQCMData;
      const exam = normalizeExamData(data);

      allCards = allCards.concat(buildCardsFromExam(exam, slug));
    } catch {
      continue;
    }
  }

  const shuffled = shuffle(allCards).slice(0, limit);

  return NextResponse.json({ cards: shuffled, total: allCards.length });
}
