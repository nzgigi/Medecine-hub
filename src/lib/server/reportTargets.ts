import fs from "fs";
import { safeJoinInside, sanitizeSlug } from "./security";

/**
 * Un signalement garde le nom de la matière et l'année, pas le fichier de
 * l'épreuve. Plusieurs épreuves pouvant porter le même nom, on les départage
 * avec l'identifiant et l'énoncé de la question.
 */

export interface ReportTarget {
  slug: string;
  annee: number;
}

interface ReportedQuestion {
  matiere: string;
  annee: number;
  questionId: number;
  questionText: string | null;
}

interface IndexEntry {
  matiere: string;
  slug: string;
  annee: number;
}

export interface ExamQuestion {
  id: number;
  question?: string;
}

export type LoadQuestions = (slug: string, annee: number) => ExamQuestion[];

const normalizeText = (value: string) => value.replace(/\s+/g, " ").trim();

export function findReportTarget(
  report: ReportedQuestion,
  index: IndexEntry[],
  loadQuestions: LoadQuestions
): ReportTarget | null {
  const candidates = index
    .filter((entry) => entry.matiere === report.matiere && entry.annee === report.annee)
    .flatMap((entry) => {
      const question = loadQuestions(entry.slug, entry.annee).find(
        (item) => item.id === report.questionId
      );
      return question ? [{ slug: entry.slug, annee: entry.annee, question }] : [];
    });

  const reportedText = normalizeText(report.questionText ?? "");
  // L'énoncé signalé est tronqué à 2000 caractères : on compare le début.
  const sameText = reportedText
    ? candidates.filter((item) =>
        normalizeText(item.question.question ?? "").startsWith(reportedText)
      )
    : [];

  // Sans énoncé concordant (question déjà corrigée), on n'accepte qu'un candidat unique.
  const matches = sameText.length > 0 ? sameText : candidates;
  if (matches.length !== 1) return null;

  return { slug: matches[0].slug, annee: matches[0].annee };
}

function readJson(...segments: string[]): unknown {
  const file = safeJoinInside(process.cwd(), "public", "data", "qcm", ...segments);
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

export function addReportTargets<T extends ReportedQuestion>(
  reports: T[]
): (T & { target: ReportTarget | null })[] {
  let index: IndexEntry[];
  try {
    index = readJson("index.json") as IndexEntry[];
  } catch {
    index = [];
  }

  const cache = new Map<string, ExamQuestion[]>();
  const loadQuestions: LoadQuestions = (slug, annee) => {
    const key = `${slug}_${annee}`;
    let questions = cache.get(key);

    if (!questions) {
      try {
        const exam = readJson(`${sanitizeSlug(slug)}_${annee}.json`) as {
          folders?: { questions?: ExamQuestion[] }[];
          questions?: ExamQuestion[];
        };
        questions = exam.folders?.length
          ? exam.folders.flatMap((folder) => folder.questions ?? [])
          : exam.questions ?? [];
      } catch {
        questions = [];
      }
      cache.set(key, questions);
    }

    return questions;
  };

  return reports.map((report) => ({
    ...report,
    target: findReportTarget(report, index, loadQuestions),
  }));
}
