import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { safeJoinInside } from "@/lib/server/security";
import type { MedtokCardEntry } from "@/app/api/admin/medtok-cards/route";

export interface MedTokCard {
  id: string;
  matiere: string;
  slug: string;
  contexte?: string;
  question: string;
  proposition: string;
  isTrue: boolean;
  correctionExplanation?: string;
}

const cardsPath = safeJoinInside(process.cwd(), "public", "data", "medtok", "cards.json");

function readCards(): MedtokCardEntry[] {
  if (!fs.existsSync(cardsPath)) return [];

  try {
    return JSON.parse(fs.readFileSync(cardsPath, "utf-8")) as MedtokCardEntry[];
  } catch {
    return [];
  }
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
    Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 150) : 50;

  const allCards = readCards().filter(
    (card) => !matiereFilter || matiereFilter === "all" || card.slug === matiereFilter
  );

  const shuffled = shuffle(allCards)
    .slice(0, limit)
    .map(
      (card): MedTokCard => ({
        id: card.id,
        matiere: card.matiere,
        slug: card.slug,
        contexte: card.contexte,
        question: card.question,
        proposition: card.proposition,
        isTrue: card.isTrue,
        correctionExplanation: card.correctionExplanation,
      })
    );

  return NextResponse.json({ cards: shuffled, total: allCards.length });
}
