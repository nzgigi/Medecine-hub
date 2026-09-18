/**
 * "Mes erreurs" : questions ratées lors des épreuves et séances de révision,
 * gardées dans le navigateur (comme l'historique `qcm_history`).
 *
 * Une question ratée entre dans la liste ; la réussir plus tard (en épreuve ou
 * en révision) la retire.
 */

export const MISTAKES_STORAGE_KEY = "qcm_mistakes";
export const MISTAKES_UPDATED_EVENT = "medecine-hub-mistakes-updated";

/** Identifie une question de façon stable : fichier d'épreuve (slug + année) + id dans ce fichier. */
export interface QuestionRef {
  slug: string;
  annee: number;
  questionId: number;
}

export interface MistakeEntry extends QuestionRef {
  /** Libellé de la matière, pour l'affichage. */
  matiere: string;
  /**
   * Début du texte de la question au moment de l'erreur. Si l'épreuve est
   * modifiée depuis (questions renumérotées...), on détecte que l'id ne
   * pointe plus vers la même question et on l'ignore plutôt que de proposer
   * une mauvaise question.
   */
  fingerprint: string;
  wrongCount: number;
  lastWrongAt: string;
}

export type MistakeStore = Record<string, MistakeEntry>;

export interface QuestionOutcome extends QuestionRef {
  matiere: string;
  questionText: string;
  correct: boolean;
}

const FINGERPRINT_LENGTH = 60;

export function mistakeKey(ref: QuestionRef): string {
  return `${ref.slug}|${ref.annee}|${ref.questionId}`;
}

export function questionFingerprint(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim().slice(0, FINGERPRINT_LENGTH);
}

/** Applique les résultats d'une épreuve/séance : les ratées entrent (ou se cumulent), les réussies sortent. */
export function applyOutcomes(
  store: MistakeStore,
  outcomes: QuestionOutcome[],
  now: string
): MistakeStore {
  const next: MistakeStore = { ...store };

  for (const outcome of outcomes) {
    const key = mistakeKey(outcome);

    if (outcome.correct) {
      delete next[key];
      continue;
    }

    next[key] = {
      slug: outcome.slug,
      annee: outcome.annee,
      questionId: outcome.questionId,
      matiere: outcome.matiere,
      fingerprint: questionFingerprint(outcome.questionText),
      wrongCount: (store[key]?.wrongCount ?? 0) + 1,
      lastWrongAt: now,
    };
  }

  return next;
}

/** Les plus ratées d'abord, puis les plus anciennes (celles qu'on a le moins revues récemment). */
export function sortByPriority(entries: MistakeEntry[]): MistakeEntry[] {
  return [...entries].sort(
    (a, b) => b.wrongCount - a.wrongCount || a.lastWrongAt.localeCompare(b.lastWrongAt)
  );
}

export interface MistakeExamGroup {
  slug: string;
  annee: number;
  matiere: string;
  count: number;
  lastWrongAt: string;
}

/** Erreurs regroupées par épreuve, les plus nombreuses d'abord. */
export function groupByExam(entries: MistakeEntry[]): MistakeExamGroup[] {
  const groups = new Map<string, MistakeExamGroup>();

  for (const entry of entries) {
    const key = `${entry.slug}|${entry.annee}`;
    const group = groups.get(key);

    if (!group) {
      groups.set(key, {
        slug: entry.slug,
        annee: entry.annee,
        matiere: entry.matiere,
        count: 1,
        lastWrongAt: entry.lastWrongAt,
      });
      continue;
    }

    group.count++;
    if (entry.lastWrongAt > group.lastWrongAt) group.lastWrongAt = entry.lastWrongAt;
  }

  return [...groups.values()].sort(
    (a, b) =>
      b.count - a.count ||
      a.matiere.localeCompare(b.matiere, "fr") ||
      b.annee - a.annee
  );
}

function isMistakeEntry(value: unknown): value is MistakeEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;

  return (
    typeof entry.slug === "string" &&
    Number.isInteger(entry.annee) &&
    Number.isInteger(entry.questionId) &&
    typeof entry.matiere === "string" &&
    typeof entry.fingerprint === "string" &&
    typeof entry.wrongCount === "number" &&
    typeof entry.lastWrongAt === "string"
  );
}

/** Lecture tolérante : un stockage corrompu ou modifié à la main ne doit jamais casser la page. */
export function parseMistakeStore(raw: string | null): MistakeStore {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};

    const store: MistakeStore = {};
    for (const value of Object.values(parsed)) {
      if (isMistakeEntry(value)) store[mistakeKey(value)] = value;
    }

    return store;
  } catch {
    return {};
  }
}

// --- Accès navigateur ---------------------------------------------------

export function readMistakes(): MistakeStore {
  try {
    return parseMistakeStore(localStorage.getItem(MISTAKES_STORAGE_KEY));
  } catch {
    return {};
  }
}

function writeMistakes(store: MistakeStore) {
  try {
    localStorage.setItem(MISTAKES_STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new Event(MISTAKES_UPDATED_EVENT));
  } catch {
    // Stockage plein ou indisponible : on perd le suivi, pas l'épreuve.
  }
}

export function recordOutcomes(outcomes: QuestionOutcome[]) {
  if (outcomes.length === 0) return;
  writeMistakes(applyOutcomes(readMistakes(), outcomes, new Date().toISOString()));
}

export function removeMistakes(refs: QuestionRef[]) {
  const store = readMistakes();
  for (const ref of refs) delete store[mistakeKey(ref)];
  writeMistakes(store);
}

export function clearMistakes() {
  writeMistakes({});
}
