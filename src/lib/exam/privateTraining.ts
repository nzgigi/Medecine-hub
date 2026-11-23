/**
 * QCM privés (admin) : identité stable des questions, historique des réponses,
 * filtres et tirage de l'entraînement. Logique pure, testée dans privateTraining.test.ts.
 *
 * Les ids de question sont régénérés à chaque import (compteur 1..N) : on ne
 * s'en sert donc pas. Une question est retrouvée par (slug, titre du dossier,
 * énoncé), ce qui permet de réimporter un fichier corrigé sans perdre l'historique.
 */

import type {
  ExamData,
  ExamFolder,
  FolderType,
  Question,
  QuestionPopulation,
  QuestionRang,
} from "@/types/exam";

/** Ancienne clé de stockage navigateur (v1) : lue une fois pour migrer vers le serveur, puis supprimée. */
export const LEGACY_PRIVATE_HISTORY_STORAGE_KEY = "qcm_private_history";
export const PRIVATE_HISTORY_UPDATED_EVENT = "medecine-hub-private-history-updated";

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, " ").trim();

/** Hash FNV-1a 32 bits : suffisant pour un usage personnel, clé courte et stable. */
function hash(value: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export function privateQuestionKey(slug: string, folderTitle: string, statement: string): string {
  return `${slug}|${hash(`${normalize(folderTitle)}\u0000${normalize(statement)}`)}`;
}

// --- Réserve de questions -------------------------------------------------

export interface PoolQuestion {
  key: string;
  slug: string;
  annee: number;
  matiere: string;
  folderId: string;
  folderTitle: string;
  folderType: FolderType;
  folderDescription?: string;
  item?: string;
  question: Question;
  /** Position dans le fichier (tous dossiers confondus), pour l'ordre "du fichier". */
  position: number;
}

/** Aplatit les QCM privés. Deux questions identiques dans un même dossier gardent des clés distinctes. */
export function buildPool(exams: ExamData[]): PoolQuestion[] {
  const pool: PoolQuestion[] = [];

  for (const exam of exams) {
    const slug = exam.slug ?? "";
    const seen = new Map<string, number>();
    let position = 0;

    for (const folder of exam.folders) {
      for (const question of folder.questions) {
        const base = privateQuestionKey(slug, folder.title, question.question);
        const occurrence = seen.get(base) ?? 0;
        seen.set(base, occurrence + 1);

        pool.push({
          key: occurrence === 0 ? base : `${base}#${occurrence}`,
          slug,
          annee: exam.annee,
          matiere: exam.matiere,
          folderId: folder.id,
          folderTitle: folder.title,
          folderType: folder.type,
          folderDescription: folder.description,
          item: folder.item,
          question,
          position: position++,
        });
      }
    }
  }

  return pool;
}

// --- Historique -----------------------------------------------------------

export interface PrivateHistoryEntry {
  key: string;
  slug: string;
  annee: number;
  matiere: string;
  folderTitle: string;
  /** Début de l'énoncé, pour afficher la question même si le fichier a été supprimé. */
  preview: string;
  attempts: number;
  wrongCount: number;
  /** Dernier résultat : faux = erreur active. Réussir une fois sort de la liste d'erreurs. */
  lastCorrect: boolean;
  lastAt: string;
}

export type PrivateHistory = Record<string, PrivateHistoryEntry>;

export interface PrivateOutcome {
  key: string;
  slug: string;
  annee: number;
  matiere: string;
  folderTitle: string;
  questionText: string;
  /** Réponse entièrement exacte (même règle que "Mes erreurs" des annales). */
  correct: boolean;
}

const PREVIEW_LENGTH = 140;

export function applyPrivateOutcomes(
  history: PrivateHistory,
  outcomes: PrivateOutcome[],
  now: string
): PrivateHistory {
  const next: PrivateHistory = { ...history };

  for (const outcome of outcomes) {
    const previous = next[outcome.key];

    next[outcome.key] = {
      key: outcome.key,
      slug: outcome.slug,
      annee: outcome.annee,
      matiere: outcome.matiere,
      folderTitle: outcome.folderTitle,
      preview: outcome.questionText.replace(/\s+/g, " ").trim().slice(0, PREVIEW_LENGTH),
      attempts: (previous?.attempts ?? 0) + 1,
      wrongCount: (previous?.wrongCount ?? 0) + (outcome.correct ? 0 : 1),
      lastCorrect: outcome.correct,
      lastAt: now,
    };
  }

  return next;
}

function isHistoryEntry(value: unknown): value is PrivateHistoryEntry {
  if (typeof value !== "object" || value === null) return false;
  const e = value as Record<string, unknown>;

  return (
    typeof e.key === "string" &&
    typeof e.slug === "string" &&
    Number.isInteger(e.annee) &&
    typeof e.matiere === "string" &&
    typeof e.folderTitle === "string" &&
    typeof e.preview === "string" &&
    typeof e.attempts === "number" &&
    typeof e.wrongCount === "number" &&
    typeof e.lastCorrect === "boolean" &&
    typeof e.lastAt === "string"
  );
}

export function parsePrivateHistory(raw: string | null): PrivateHistory {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};

    const history: PrivateHistory = {};
    for (const value of Object.values(parsed)) {
      if (isHistoryEntry(value)) history[value.key] = value;
    }
    return history;
  } catch {
    return {};
  }
}

/** Fusionne deux historiques (clé par clé, le plus récent l'emporte) : sert à la reprise de l'ancien stockage navigateur. */
export function mergePrivateHistories(base: PrivateHistory, incoming: PrivateHistory): PrivateHistory {
  const merged: PrivateHistory = { ...base };
  for (const [key, entry] of Object.entries(incoming)) {
    const existing = merged[key];
    if (!existing || entry.lastAt > existing.lastAt) merged[key] = entry;
  }
  return merged;
}

// --- Filtres --------------------------------------------------------------

export type PrivateStatus = "jamais" | "erreurs" | "reussies";

/** Chaque champ vide = pas de filtre. Les filtres se combinent (ET). */
export interface PrivateFilters {
  matiere: string;
  item: string;
  rang: QuestionRang | "";
  population: QuestionPopulation | "";
  type: FolderType | "";
  statut: PrivateStatus | "";
}

export const EMPTY_FILTERS: PrivateFilters = {
  matiere: "",
  item: "",
  rang: "",
  population: "",
  type: "",
  statut: "",
};

/** Population d'une question : absente = adulte. */
export function populationOf(question: { population?: QuestionPopulation }): QuestionPopulation {
  return question.population ?? "adulte";
}

export function statusOf(history: PrivateHistory, key: string): PrivateStatus {
  const entry = history[key];
  if (!entry) return "jamais";
  return entry.lastCorrect ? "reussies" : "erreurs";
}

export function applyFilters(
  pool: PoolQuestion[],
  filters: PrivateFilters,
  history: PrivateHistory
): PoolQuestion[] {
  return pool.filter((entry) => {
    if (filters.matiere && entry.slug !== filters.matiere) return false;
    if (filters.item && entry.item !== filters.item) return false;
    if (filters.rang && entry.question.rang !== filters.rang) return false;
    if (filters.population && populationOf(entry.question) !== filters.population) return false;
    if (filters.type && entry.folderType !== filters.type) return false;
    if (filters.statut && statusOf(history, entry.key) !== filters.statut) return false;
    return true;
  });
}

export interface FilterOptions {
  matieres: { slug: string; label: string }[];
  items: string[];
}

export function filterOptions(pool: PoolQuestion[]): FilterOptions {
  const matieres = new Map<string, string>();
  const items = new Set<string>();

  for (const entry of pool) {
    matieres.set(entry.slug, entry.matiere);
    if (entry.item) items.add(entry.item);
  }

  return {
    matieres: [...matieres].map(([slug, label]) => ({ slug, label })).sort((a, b) => a.label.localeCompare(b.label, "fr")),
    items: [...items].sort((a, b) => a.localeCompare(b, "fr", { numeric: true })),
  };
}

const FILTER_FIELDS = ["matiere", "item", "rang", "population", "type", "statut"] as const;

export function filtersToParams(filters: PrivateFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const field of FILTER_FIELDS) if (filters[field]) params.set(field, filters[field]);
  return params;
}

/** Lecture tolérante : une valeur inconnue dans l'URL est ignorée. */
export function filtersFromParams(params: URLSearchParams): PrivateFilters {
  const pick = <T extends string>(name: string, allowed: readonly T[]): T | "" => {
    const value = params.get(name) ?? "";
    return (allowed as readonly string[]).includes(value) ? (value as T) : "";
  };

  return {
    matiere: params.get("matiere") ?? "",
    item: params.get("item") ?? "",
    rang: pick("rang", ["A", "B"] as const),
    population: pick("population", ["adulte", "pediatrie"] as const),
    type: pick("type", ["SQI", "DP", "KFP"] as const),
    statut: pick("statut", ["jamais", "erreurs", "reussies"] as const),
  };
}

// --- Tirage ---------------------------------------------------------------

export type TrainingOrder = "aleatoire" | "fichier";

/** Un bloc se joue d'un seul tenant : un DP/KFP entier, ou une SQI isolée. */
export interface TrainingBlock {
  /** Dossier d'origine : titre, type et introduction affichés avec chaque question. */
  folder: Pick<ExamFolder, "id" | "type" | "title" | "description"> & { item?: string };
  slug: string;
  annee: number;
  matiere: string;
  /** Dans l'ordre du dossier. */
  questions: PoolQuestion[];
}

export function shuffled<T>(items: T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Découpe en blocs : DP et KFP restent groupés (questions dans l'ordre du
 * fichier), les SQI sont tirées question par question. En ordre aléatoire,
 * les blocs sont mélangés sans tenir compte du dossier ni de la matière.
 */
export function buildTrainingBlocks(
  questions: PoolQuestion[],
  order: TrainingOrder,
  random: () => number = Math.random
): TrainingBlock[] {
  const inFileOrder = [...questions].sort(
    (a, b) => a.slug.localeCompare(b.slug) || a.annee - b.annee || a.position - b.position
  );

  const blocks: TrainingBlock[] = [];
  const open = new Map<string, TrainingBlock>();

  for (const entry of inFileOrder) {
    const folder = {
      id: entry.folderId,
      type: entry.folderType,
      title: entry.folderTitle,
      description: entry.folderDescription,
      item: entry.item,
    };

    if (entry.folderType === "SQI") {
      blocks.push({ folder, slug: entry.slug, annee: entry.annee, matiere: entry.matiere, questions: [entry] });
      continue;
    }

    const groupKey = `${entry.slug}|${entry.annee}|${entry.folderId}`;
    let block = open.get(groupKey);
    if (!block) {
      block = { folder, slug: entry.slug, annee: entry.annee, matiere: entry.matiere, questions: [] };
      open.set(groupKey, block);
      blocks.push(block);
    }
    block.questions.push(entry);
  }

  return order === "aleatoire" ? shuffled(blocks, random) : blocks;
}

export function countBlockQuestions(blocks: TrainingBlock[]): number {
  return blocks.reduce((sum, block) => sum + block.questions.length, 0);
}
