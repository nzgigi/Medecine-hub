import { NextResponse } from "next/server";
import { getAdminActor, requireAdminRequest } from "@/lib/server/security";
import { logAdminAction } from "@/lib/server/adminLog";
import {
  clearPrivateHistory,
  importLegacyHistory,
  readPrivateHistory,
  recordPrivateOutcomes,
} from "@/lib/server/privateHistory";
import { parsePrivateHistory, type PrivateOutcome } from "@/lib/exam/privateTraining";

export const dynamic = "force-dynamic";

const fail = (message: string, status = 400) =>
  NextResponse.json({ success: false, message }, { status });

const noStore = { "Cache-Control": "no-store" };

function isOutcome(value: unknown): value is PrivateOutcome {
  if (typeof value !== "object" || value === null) return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.key === "string" &&
    typeof o.slug === "string" &&
    Number.isInteger(o.annee) &&
    typeof o.matiere === "string" &&
    typeof o.folderTitle === "string" &&
    typeof o.questionText === "string" &&
    typeof o.correct === "boolean"
  );
}

// Réservé à l'administrateur : erreurs et réponses des QCM privés, jamais renvoyées par une route publique.
export async function GET(request: Request) {
  const unauthorized = requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  return NextResponse.json({ success: true, history: readPrivateHistory() }, { headers: noStore });
}

export async function POST(request: Request) {
  const unauthorized = requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as { outcomes?: unknown; legacyHistory?: unknown };

    // Reprise de l'historique v1 (qui était gardé dans le navigateur).
    if (body.legacyHistory !== undefined) {
      const history = importLegacyHistory(parsePrivateHistory(JSON.stringify(body.legacyHistory)));
      return NextResponse.json({ success: true, history }, { headers: noStore });
    }

    if (!Array.isArray(body.outcomes) || !body.outcomes.every(isOutcome)) {
      return fail("Résultats invalides.");
    }
    if (body.outcomes.length > 500) return fail("Trop de résultats en une fois.");

    const history = recordPrivateOutcomes(body.outcomes);
    return NextResponse.json({ success: true, history }, { headers: noStore });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Erreur serveur", 500);
  }
}

export async function DELETE(request: Request) {
  const unauthorized = requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  clearPrivateHistory();
  logAdminAction(getAdminActor(request), "Effacement historique QCM prives", "tout");
  return NextResponse.json({ success: true });
}
