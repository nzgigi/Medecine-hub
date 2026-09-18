import type { ExamData, Question } from "@/types/exam";
import { normalizeExamData, flattenExamQuestions } from "./normalizeExam";
import { questionFingerprint, type QuestionRef } from "./mistakes";

/**
 * Séance de révision : une liste de questions tirées de plusieurs épreuves,
 * rejouée avec le même moteur que les épreuves (voir components/ExamRunner).
 */

export const PRACTICE_SESSION_STORAGE_KEY = "practice_session";
export const PRACTICE_SESSION_SIZE = 20;

export interface PracticeQuestionRef extends QuestionRef {
  /** Empreinte du texte attendu ; une question qui ne correspond plus est écartée. */
  fingerprint?: string;
}

export interface PracticeSession {
  id: string;
  kind: "erreurs";
  title: string;
  refs: PracticeQuestionRef[];
  createdAt: string;
}

/** D'où vient une question de la séance (pour signaler une erreur ou mettre à jour "Mes erreurs"). */
export interface QuestionOrigin extends QuestionRef {
  matiere: string;
}

export interface PracticeExam {
  exam: ExamData;
  /** Indexé par l'id de la question DANS la séance (renuméroté 1..N). */
  origins: Record<number, QuestionOrigin>;
  /** Questions retrouvées introuvables ou modifiées depuis. */
  missing: number;
}

export function createSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Mélange de Fisher-Yates, sans modifier le tableau d'origine. */
export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

export function saveSession(session: PracticeSession) {
  localStorage.setItem(PRACTICE_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function loadSession(): PracticeSession | null {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(PRACTICE_SESSION_STORAGE_KEY) || "null"
    ) as PracticeSession | null;

    if (!parsed || typeof parsed.id !== "string" || !Array.isArray(parsed.refs)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function practiceAttemptKey(session: PracticeSession) {
  return `practice_attempt_${session.id}`;
}

/** Ne charge que les épreuves nécessaires ; une épreuve introuvable compte ses questions comme manquantes. */
async function loadExamQuestions(slug: string, annee: number) {
  try {
    const response = await fetch(`/data/qcm/${slug}_${annee}.json`);
    if (!response.ok) return null;

    const exam = normalizeExamData((await response.json()) as ExamData);
    return { exam, questions: new Map(flattenExamQuestions(exam).map((q) => [q.id, q])) };
  } catch {
    return null;
  }
}

export async function loadPracticeExam(session: PracticeSession): Promise<PracticeExam> {
  const examKeys = [...new Set(session.refs.map((ref) => `${ref.slug}|${ref.annee}`))];
  const loaded = new Map(
    await Promise.all(
      examKeys.map(async (key) => {
        const [slug, annee] = key.split("|");
        return [key, await loadExamQuestions(slug, Number(annee))] as const;
      })
    )
  );

  const questions: Question[] = [];
  const origins: Record<number, QuestionOrigin> = {};
  let missing = 0;

  for (const ref of session.refs) {
    const source = loaded.get(`${ref.slug}|${ref.annee}`);
    const question = source?.questions.get(ref.questionId);

    if (
      !source ||
      !question ||
      (ref.fingerprint && questionFingerprint(question.question) !== ref.fingerprint)
    ) {
      missing++;
      continue;
    }

    // Ids renumérotés : deux épreuves différentes peuvent avoir chacune une "question 3".
    const id = questions.length + 1;
    questions.push({ ...question, id, order: id });
    origins[id] = {
      slug: ref.slug,
      annee: ref.annee,
      questionId: ref.questionId,
      matiere: source.exam.matiere,
    };
  }

  const exam: ExamData = {
    matiere: session.title,
    annee: new Date(session.createdAt).getFullYear(),
    title: session.title,
    total_questions: questions.length,
    folders: [
      {
        id: "revision",
        type: "SQI",
        title: "Questions à revoir",
        order: 1,
        questions,
      },
    ],
  };

  return { exam, origins, missing };
}
