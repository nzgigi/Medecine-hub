import { NextResponse } from "next/server";
import fs from "fs";
import crypto from "crypto";
import { getAdminActor, requireAdminRequest, safeJoinInside } from "@/lib/server/security";
import { logAdminAction } from "@/lib/server/adminLog";

export interface MedtokCardEntry {
  id: string;
  matiere: string;
  slug: string;
  contexte?: string;
  question: string;
  proposition: string;
  isTrue: boolean;
  correctionExplanation?: string;
  createdAt: string;
  updatedAt: string;
}

const dataDir = safeJoinInside(process.cwd(), "public", "data", "medtok");
const cardsPath = safeJoinInside(dataDir, "cards.json");

function readCards(): MedtokCardEntry[] {
  if (!fs.existsSync(cardsPath)) return [];

  try {
    return JSON.parse(fs.readFileSync(cardsPath, "utf-8")) as MedtokCardEntry[];
  } catch {
    return [];
  }
}

function writeCards(cards: MedtokCardEntry[]) {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2), "utf-8");
}

function sanitizePayload(body: Record<string, unknown>) {
  const matiere = typeof body.matiere === "string" ? body.matiere.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const question = typeof body.question === "string" ? body.question.trim() : "";
  const proposition = typeof body.proposition === "string" ? body.proposition.trim() : "";
  const contexte = typeof body.contexte === "string" ? body.contexte.trim() : "";
  const correctionExplanation =
    typeof body.correctionExplanation === "string" ? body.correctionExplanation.trim() : "";
  const isTrue = Boolean(body.isTrue);

  if (!matiere || !slug || !question || !proposition) return null;

  return { matiere, slug, question, proposition, contexte, correctionExplanation, isTrue };
}

export async function GET(request: Request) {
  const unauthorized = requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  const cards = readCards().sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return NextResponse.json({ success: true, cards });
}

export async function POST(request: Request) {
  try {
    const unauthorized = requireAdminRequest(request);
    if (unauthorized) return unauthorized;

    const body = (await request.json()) as Record<string, unknown>;

    if (body.action === "create") {
      const payload = sanitizePayload(body);

      if (!payload) {
        return NextResponse.json(
          { success: false, message: "Matiere, question et proposition sont requis" },
          { status: 400 }
        );
      }

      const now = new Date().toISOString();
      const card: MedtokCardEntry = {
        id: crypto.randomUUID(),
        ...payload,
        createdAt: now,
        updatedAt: now,
      };

      const cards = readCards();
      cards.push(card);
      writeCards(cards);

      logAdminAction(getAdminActor(request), "Creation d'une carte MedTok", card.question.slice(0, 80));

      return NextResponse.json({ success: true, card });
    }

    if (body.action === "update") {
      const id = typeof body.id === "string" ? body.id : "";
      const payload = sanitizePayload(body);

      if (!id || !payload) {
        return NextResponse.json(
          { success: false, message: "Identifiant, matiere, question et proposition sont requis" },
          { status: 400 }
        );
      }

      const cards = readCards();
      const index = cards.findIndex((card) => card.id === id);

      if (index === -1) {
        return NextResponse.json(
          { success: false, message: "Carte introuvable" },
          { status: 404 }
        );
      }

      cards[index] = {
        ...cards[index],
        ...payload,
        updatedAt: new Date().toISOString(),
      };

      writeCards(cards);

      logAdminAction(getAdminActor(request), "Modification d'une carte MedTok", payload.question.slice(0, 80));

      return NextResponse.json({ success: true, card: cards[index] });
    }

    if (body.action === "delete") {
      const id = typeof body.id === "string" ? body.id : "";
      if (!id) {
        return NextResponse.json(
          { success: false, message: "Identifiant requis" },
          { status: 400 }
        );
      }

      const cards = readCards();
      const nextCards = cards.filter((card) => card.id !== id);

      if (nextCards.length === cards.length) {
        return NextResponse.json(
          { success: false, message: "Carte introuvable" },
          { status: 404 }
        );
      }

      writeCards(nextCards);

      logAdminAction(getAdminActor(request), "Suppression d'une carte MedTok", id);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, message: "Action inconnue" },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Erreur serveur",
      },
      { status: 500 }
    );
  }
}
