// Import en masse de cartes MedTok depuis un fichier JSON (souvent genere par une IA).
// Logique pure, partagee entre l'apercu cote admin et la route d'import.

export interface MedtokSubject {
  slug: string;
  matiere: string;
}

export interface MedtokImportCard {
  matiere: string;
  slug: string;
  contexte: string;
  question: string;
  proposition: string;
  isTrue: boolean;
  correctionExplanation: string;
}

export interface MedtokImportError {
  index: number;
  message: string;
}

export interface MedtokImportResult {
  valid: MedtokImportCard[];
  duplicates: number;
  errors: MedtokImportError[];
}

// Nginx limite les requetes a 1 Mo en prod : 500 cartes laissent de la marge.
export const MEDTOK_IMPORT_MAX_CARDS = 500;

const TRUE_VALUES = new Set(["true", "vrai", "v", "oui", "1"]);
const FALSE_VALUES = new Set(["false", "faux", "f", "non", "0"]);

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function medtokCardKey(card: { slug: string; question: string; proposition: string }) {
  return [card.slug, normalizeKey(card.question), normalizeKey(card.proposition)].join("|");
}

function parseBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1 ? true : value === 0 ? false : null;
  if (typeof value === "string") {
    const normalized = normalizeKey(value);
    if (TRUE_VALUES.has(normalized)) return true;
    if (FALSE_VALUES.has(normalized)) return false;
  }
  return null;
}

// Les IA entourent souvent le JSON de ```json ... ``` : on l'enleve avant de parser.
function stripCodeFence(raw: string) {
  const fenced = raw.trim().match(/^```[a-zA-Z]*\s*\n([\s\S]*?)\n?```$/);
  return fenced ? fenced[1] : raw.replace(/^﻿/, "");
}

// Accepte un tableau de cartes ou un objet { cards: [...] } (format du modele telechargeable).
export function extractMedtokCards(raw: string): unknown[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    throw new Error("Le fichier n'est pas un JSON valide.");
  }

  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object" && Array.isArray((parsed as { cards?: unknown }).cards)) {
    return (parsed as { cards: unknown[] }).cards;
  }

  throw new Error('Le fichier doit contenir une liste de cartes, ou un objet avec une cle "cards".');
}

export function validateMedtokCards(
  items: unknown[],
  subjects: MedtokSubject[],
  existing: { slug: string; question: string; proposition: string }[] = []
): MedtokImportResult {
  const bySlug = new Map(subjects.map((subject) => [subject.slug.toLowerCase(), subject]));
  const byName = new Map(subjects.map((subject) => [normalizeKey(subject.matiere), subject]));
  const seen = new Set(existing.map(medtokCardKey));

  const valid: MedtokImportCard[] = [];
  const errors: MedtokImportError[] = [];
  let duplicates = 0;

  if (items.length > MEDTOK_IMPORT_MAX_CARDS) {
    return {
      valid,
      duplicates,
      errors: [
        {
          index: 0,
          message: `Trop de cartes (${items.length}). Maximum ${MEDTOK_IMPORT_MAX_CARDS} par fichier.`,
        },
      ],
    };
  }

  items.forEach((item, position) => {
    const index = position + 1;

    if (!item || typeof item !== "object" || Array.isArray(item)) {
      errors.push({ index, message: "Ce n'est pas une carte (objet attendu)." });
      return;
    }

    const record = item as Record<string, unknown>;
    const slugValue = text(record.slug);
    const matiereValue = text(record.matiere);
    const subject =
      bySlug.get(slugValue.toLowerCase()) ?? (matiereValue ? byName.get(normalizeKey(matiereValue)) : undefined);

    if (!subject) {
      const given = slugValue || matiereValue;
      errors.push({
        index,
        message: given ? `Matiere inconnue : "${given}".` : 'Champ "slug" manquant.',
      });
      return;
    }

    const question = text(record.question);
    const proposition = text(record.proposition);
    if (!question || !proposition) {
      errors.push({
        index,
        message: !question ? 'Champ "question" vide.' : 'Champ "proposition" vide.',
      });
      return;
    }

    const isTrue = parseBoolean(record.isTrue ?? record.reponse);
    if (isTrue === null) {
      errors.push({ index, message: 'Champ "isTrue" invalide : mettre true ou false.' });
      return;
    }

    const card: MedtokImportCard = {
      matiere: subject.matiere,
      slug: subject.slug,
      contexte: text(record.contexte),
      question,
      proposition,
      isTrue,
      correctionExplanation: text(record.correction ?? record.correctionExplanation),
    };

    const key = medtokCardKey(card);
    if (seen.has(key)) {
      duplicates += 1;
      return;
    }

    seen.add(key);
    valid.push(card);
  });

  return { valid, duplicates, errors };
}

export function buildMedtokTemplate(subjects: MedtokSubject[]) {
  const [first, second] = [subjects[0], subjects[1] ?? subjects[0]];

  return {
    instructions: [
      'Remplir la liste "cards" avec des cartes MedTok : une proposition a juger vraie ou fausse.',
      'Les cartes de "exemples" montrent le format et ne sont jamais importees.',
      '"slug" : obligatoire, doit etre exactement un des slugs de "matieres_autorisees".',
      '"question" et "proposition" : obligatoires.',
      '"isTrue" : obligatoire, true si la proposition est vraie, false sinon (sans guillemets).',
      '"contexte" (vignette clinique) et "correction" (explication affichee apres la reponse) : optionnels.',
      "Repondre uniquement avec ce JSON complet, sans texte autour.",
    ],
    matieres_autorisees: subjects.map((subject) => ({ slug: subject.slug, matiere: subject.matiere })),
    exemples: [
      {
        slug: first?.slug ?? "slug-de-la-matiere",
        contexte: "Patient de 65 ans admis pour une douleur thoracique constrictive.",
        question: "Concernant la vascularisation coronaire :",
        proposition: "L'artere interventriculaire anterieure est une branche de la coronaire droite.",
        isTrue: false,
        correction: "Elle nait de la coronaire gauche (tronc commun).",
      },
      {
        slug: second?.slug ?? "slug-de-la-matiere",
        question: "Exemple de question sans contexte :",
        proposition: "Exemple de proposition vraie.",
        isTrue: true,
      },
    ],
    cards: [],
  };
}
