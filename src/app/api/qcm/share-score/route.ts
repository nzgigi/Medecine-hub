import { NextRequest, NextResponse } from "next/server";
import { parseScoreShareParams } from "@/lib/shareScore";
import { signScoreShare } from "@/lib/server/scoreShareSignature";

interface ShareScoreBody {
  slug?: unknown;
  matiere?: unknown;
  annee?: unknown;
  score?: unknown;
}

function toParamString(value: unknown): string | undefined {
  return typeof value === "string" || typeof value === "number" ? String(value) : undefined;
}

// Le site tourne derriere un reverse proxy : request.url reflete l'adresse
// d'ecoute interne de Next.js (ex. localhost:4000), jamais le domaine public.
const SITE_URL = "https://medecinehub.fr";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ShareScoreBody;

    const params = parseScoreShareParams({
      slug: toParamString(body.slug),
      matiere: toParamString(body.matiere),
      annee: toParamString(body.annee),
      score: toParamString(body.score),
    });

    const signature = signScoreShare(params);

    const query = new URLSearchParams({
      slug: params.slug,
      matiere: params.matiere,
      annee: String(params.annee),
      score: params.score.toFixed(2),
      sig: signature,
    });

    return NextResponse.json({ success: true, url: `${SITE_URL}/resultat?${query.toString()}` });
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
