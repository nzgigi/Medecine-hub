export interface ScoreShareParams {
  slug: string;
  matiere: string;
  annee: number;
  score: number;
}

export type SignedScoreShareParams = Pick<ScoreShareParams, "matiere" | "annee" | "score">;

const MAX_MATIERE_LENGTH = 80;
const MAX_SLUG_LENGTH = 100;

type SearchParamsLike = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseScoreShareParams(params: SearchParamsLike): ScoreShareParams {
  const rawSlug = firstValue(params.slug);
  const rawMatiere = firstValue(params.matiere);
  const rawAnnee = firstValue(params.annee);
  const rawScore = firstValue(params.score);

  const slug =
    typeof rawSlug === "string" ? rawSlug.trim().slice(0, MAX_SLUG_LENGTH) : "";

  const matiere =
    typeof rawMatiere === "string" && rawMatiere.trim()
      ? rawMatiere.trim().slice(0, MAX_MATIERE_LENGTH)
      : "une épreuve";

  const anneeNumber = Number(rawAnnee);
  const annee =
    Number.isFinite(anneeNumber) && anneeNumber > 1900 && anneeNumber < 2100
      ? Math.round(anneeNumber)
      : new Date().getFullYear();

  const scoreNumber = Number(rawScore);
  const score = Number.isFinite(scoreNumber)
    ? Math.min(20, Math.max(0, Math.round(scoreNumber * 100) / 100))
    : 0;

  return { slug, matiere, annee, score };
}

/**
 * Représentation canonique signée : le slug n'y figure pas car il ne sert
 * qu'à pointer vers l'épreuve (sans conséquence s'il est modifié), alors que
 * matiere/annee/score forment l'affirmation ("j'ai eu X/20") qu'on protège
 * contre la falsification.
 */
export function scoreShareSignaturePayload(params: SignedScoreShareParams): string {
  return `${params.matiere}|${params.annee}|${params.score.toFixed(2)}`;
}
