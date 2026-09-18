import type { Question } from "@/types/exam";
import { questionFingerprint } from "./mistakes";
import { shuffle, type PracticeQuestionRef } from "./practiceSession";

/** Épreuve candidate au tirage (une ligne de public/data/qcm/index.json). */
export interface ExamSource {
  slug: string;
  annee: number;
  total_questions: number;
}

export type LoadExamQuestions = (slug: string, annee: number) => Promise<Question[] | null>;

export const CUSTOM_SESSION_SIZES = [10, 20, 30, 40, 50];
/** Durées proposées, en minutes ; null = sans chrono. */
export const CUSTOM_SESSION_TIME_LIMITS: (number | null)[] = [null, 10, 20, 30, 45, 60];

const MAX_DRAW_ROUNDS = 6;

/**
 * Répartit `count` tirages entre des épreuves, proportionnellement à leur nombre de questions :
 * chaque question du pool a la même chance d'être tirée, quelle que soit la taille de son épreuve.
 */
export function allocateSlots(
  weights: number[],
  count: number,
  random: () => number = Math.random
): number[] {
  const slots = weights.map(() => 0);
  const total = weights.reduce((acc, weight) => acc + weight, 0);
  if (total <= 0) return slots;

  for (let i = 0; i < count; i++) {
    let target = random() * total;

    for (let j = 0; j < weights.length; j++) {
      target -= weights[j];

      if (target < 0 || j === weights.length - 1) {
        slots[j]++;
        break;
      }
    }
  }

  return slots;
}

/**
 * Tire jusqu'à `count` questions distinctes dans les épreuves données.
 * Ne charge que les épreuves tirées (pas les 300+ fichiers du site) ; si une épreuve n'a plus
 * assez de questions ou ne charge pas, on retire ailleurs au tour suivant.
 */
export async function drawQuestionRefs(
  sources: ExamSource[],
  count: number,
  loadQuestions: LoadExamQuestions,
  random: () => number = Math.random
): Promise<PracticeQuestionRef[]> {
  let pool = sources.filter((source) => source.total_questions > 0);
  const cache = new Map<string, Promise<Question[] | null>>();
  const taken = new Set<string>();
  const refs: PracticeQuestionRef[] = [];

  const keyOf = (source: ExamSource) => `${source.slug}|${source.annee}`;
  const load = (source: ExamSource) => {
    const key = keyOf(source);
    if (!cache.has(key)) cache.set(key, loadQuestions(source.slug, source.annee));
    return cache.get(key)!;
  };

  for (let round = 0; round < MAX_DRAW_ROUNDS && refs.length < count && pool.length > 0; round++) {
    const slots = allocateSlots(
      pool.map((source) => source.total_questions),
      count - refs.length,
      random
    );
    const drawn = pool.filter((_, index) => slots[index] > 0);
    await Promise.all(drawn.map(load));

    const exhausted = new Set<string>();

    for (const [index, source] of pool.entries()) {
      if (slots[index] === 0) continue;

      const questions = (await load(source)) ?? [];
      const candidates = shuffle(
        questions.filter((question) => !taken.has(`${keyOf(source)}|${question.id}`)),
        random
      );
      const picked = candidates.slice(0, slots[index]);

      for (const question of picked) {
        taken.add(`${keyOf(source)}|${question.id}`);
        refs.push({
          slug: source.slug,
          annee: source.annee,
          questionId: question.id,
          fingerprint: questionFingerprint(question.question),
        });
      }

      if (candidates.length <= slots[index]) exhausted.add(keyOf(source));
    }

    pool = pool.filter((source) => !exhausted.has(keyOf(source)));
  }

  return shuffle(refs, random).slice(0, count);
}

export function formatTimeLimit(minutes: number | null): string {
  if (minutes === null) return "Sans chrono";
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60}` : ""}` : `${minutes} min`;
}
