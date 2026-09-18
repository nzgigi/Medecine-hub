"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2, Play, Shuffle, Timer } from "lucide-react";
import { useDialogs } from "@/components/DialogProvider";
import { SUBJECT_ICONS, getSubjectColorStyle } from "@/lib/subjectStyles";
import {
  CUSTOM_SESSION_SIZES,
  CUSTOM_SESSION_TIME_LIMITS,
  drawQuestionRefs,
  formatTimeLimit,
  type ExamSource,
} from "@/lib/exam/customSession";
import {
  createSessionId,
  discardSessionAttempt,
  fetchExamQuestions,
  findUnfinishedSession,
  saveSession,
  type PracticeSession,
} from "@/lib/exam/practiceSession";

interface IndexEntry extends ExamSource {
  matiere: string;
  semesterName?: string;
  semesterOrder?: number;
  subjectOrder?: number;
  subjectIcon?: string;
  subjectColor?: string;
}

interface Subject {
  slug: string;
  matiere: string;
  exams: ExamSource[];
  totalQuestions: number;
  subjectOrder: number;
  subjectIcon?: string;
  subjectColor?: string;
}

interface Semester {
  name: string;
  order: number;
  subjects: Subject[];
}

interface Prefs {
  selected: string[];
  count: number;
  timeLimit: number | null;
}

const PREFS_STORAGE_KEY = "custom_session_prefs";
const DEFAULT_SEMESTER_NAME = "Semestre 7";

function groupBySemester(entries: IndexEntry[]): Semester[] {
  const subjects = new Map<string, Subject & { semesterName: string; semesterOrder: number }>();

  for (const entry of entries) {
    const existing = subjects.get(entry.slug);

    if (!existing) {
      subjects.set(entry.slug, {
        slug: entry.slug,
        matiere: entry.matiere,
        exams: [entry],
        totalQuestions: entry.total_questions,
        subjectOrder: entry.subjectOrder ?? 999,
        subjectIcon: entry.subjectIcon,
        subjectColor: entry.subjectColor,
        semesterName: entry.semesterName?.trim() || DEFAULT_SEMESTER_NAME,
        semesterOrder: entry.semesterOrder ?? 1,
      });
      continue;
    }

    existing.exams.push(entry);
    existing.totalQuestions += entry.total_questions;
    existing.subjectIcon ||= entry.subjectIcon;
    existing.subjectColor ||= entry.subjectColor;
  }

  const semesters = new Map<string, Semester>();

  for (const subject of subjects.values()) {
    const semester = semesters.get(subject.semesterName) ?? {
      name: subject.semesterName,
      order: subject.semesterOrder,
      subjects: [],
    };

    semester.order = Math.min(semester.order, subject.semesterOrder);
    semester.subjects.push(subject);
    semesters.set(subject.semesterName, semester);
  }

  return [...semesters.values()]
    .map((semester) => ({
      ...semester,
      subjects: [...semester.subjects].sort((a, b) => a.subjectOrder - b.subjectOrder),
    }))
    .sort((a, b) => a.order - b.order);
}

function readPrefs(): Prefs | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(PREFS_STORAGE_KEY) || "null") as Prefs | null;

    if (
      !parsed ||
      !Array.isArray(parsed.selected) ||
      typeof parsed.count !== "number" ||
      !(parsed.timeLimit === null || typeof parsed.timeLimit === "number")
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function plural(count: number, singular: string) {
  return count > 1 ? `${singular}s` : singular;
}

function SubjectToggle({
  subject,
  selected,
  onToggle,
}: {
  subject: Subject;
  selected: boolean;
  onToggle: () => void;
}) {
  const Icon = subject.subjectIcon ? SUBJECT_ICONS[subject.subjectIcon] : undefined;
  const colorStyle = getSubjectColorStyle(subject.subjectColor);

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${
        selected
          ? "border-emerald-600 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/30"
          : "border-stone-200 bg-white hover:border-emerald-300 dark:border-stone-800 dark:bg-[#1d1c18] dark:hover:border-emerald-700"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
          colorStyle?.className || "border-stone-200 text-stone-400 dark:border-stone-700"
        }`}
        style={colorStyle?.style}
      >
        {Icon ? <Icon className="h-5 w-5" /> : null}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold">{subject.matiere}</span>
        <span className="block text-xs text-stone-500 dark:text-stone-400">
          {subject.exams.length} {plural(subject.exams.length, "épreuve")} ·{" "}
          {subject.totalQuestions} questions
        </span>
      </span>

      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
          selected
            ? "border-emerald-600 bg-emerald-600 text-white"
            : "border-stone-300 text-transparent dark:border-stone-600"
        }`}
        aria-hidden
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    </button>
  );
}

export default function SeancePage() {
  const router = useRouter();
  const { alert: showAlert, confirm } = useDialogs();

  const [entries, setEntries] = useState<IndexEntry[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [activeSemester, setActiveSemester] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [count, setCount] = useState(20);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const [unfinished, setUnfinished] = useState<PracticeSession | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    // localStorage et fetch ne sont disponibles qu'après le premier rendu.
    const init = () => {
      setUnfinished(findUnfinishedSession());

      const prefs = readPrefs();
      if (prefs) {
        setSelected(new Set(prefs.selected));
        setCount(prefs.count);
        setTimeLimit(prefs.timeLimit);
      }

      fetch("/data/qcm/index.json?t=" + Date.now())
        .then((response) => response.json())
        .then((data: IndexEntry[]) => setEntries(data))
        .catch(() => setLoadError(true));
    };

    init();
  }, []);

  const semesters = useMemo(() => (entries ? groupBySemester(entries) : []), [entries]);
  const currentSemester =
    semesters.find((semester) => semester.name === activeSemester) ?? semesters[0] ?? null;

  const subjectsBySlug = useMemo(
    () => new Map(semesters.flatMap((semester) => semester.subjects).map((s) => [s.slug, s])),
    [semesters]
  );

  // Les préférences enregistrées peuvent citer une matière supprimée depuis.
  const selectedSubjects = [...selected]
    .map((slug) => subjectsBySlug.get(slug))
    .filter((subject): subject is Subject => Boolean(subject));

  const availableQuestions = selectedSubjects.reduce((acc, subject) => acc + subject.totalQuestions, 0);
  const effectiveCount = Math.min(count, availableQuestions);

  const toggleSubject = (slug: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const setSemesterSelection = (semester: Semester, value: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      for (const subject of semester.subjects) {
        if (value) next.add(subject.slug);
        else next.delete(subject.slug);
      }
      return next;
    });
  };

  const startSession = async () => {
    if (effectiveCount === 0 || starting) return;

    if (
      unfinished &&
      !(await confirm("La séance en cours sera abandonnée.", {
        title: "Lancer une nouvelle séance ?",
        confirmLabel: "Remplacer",
      }))
    ) {
      return;
    }

    setStarting(true);

    const sources: ExamSource[] = selectedSubjects.flatMap((subject) => subject.exams);
    const refs = await drawQuestionRefs(sources, effectiveCount, fetchExamQuestions);

    if (refs.length === 0) {
      setStarting(false);
      await showAlert("Impossible de charger des questions. Vérifie ta connexion et réessaie.");
      return;
    }

    if (unfinished) discardSessionAttempt(unfinished);

    try {
      localStorage.setItem(
        PREFS_STORAGE_KEY,
        JSON.stringify({ selected: [...selected], count, timeLimit } satisfies Prefs)
      );
    } catch {
      // Les préférences sont un confort : on lance la séance même sans.
    }

    saveSession({
      id: createSessionId(),
      kind: "custom",
      title: `Séance personnalisée · ${refs.length} questions`,
      refs,
      timeLimitMinutes: timeLimit ?? undefined,
      createdAt: new Date().toISOString(),
    });

    router.push("/qcm/revision");
  };

  const semesterSelectedCount = (semester: Semester) =>
    semester.subjects.filter((subject) => selected.has(subject.slug)).length;

  return (
    <main className="min-h-screen bg-stone-50 pb-40 text-stone-950 dark:bg-[#151512] dark:text-stone-100">
      <div className="mx-auto max-w-5xl px-4 pt-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 transition-colors hover:text-stone-950 dark:text-stone-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l&apos;accueil
        </Link>

        <div className="mb-6 mt-6 flex items-center gap-3">
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Shuffle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black">Séance personnalisée</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Choisis tes matières : on tire des questions au hasard dans leurs annales.
            </p>
          </div>
        </div>

        {unfinished && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
            <div className="text-sm text-amber-900 dark:text-amber-100">
              <span className="font-bold">Séance en cours : </span>
              {unfinished.title}
            </div>
            <Link
              href="/qcm/revision"
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-700"
            >
              <Play className="h-4 w-4" />
              Reprendre
            </Link>
          </div>
        )}

        {loadError && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            Impossible de charger la liste des matières.
          </p>
        )}

        {!entries && !loadError && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-700 dark:text-emerald-300" />
          </div>
        )}

        {currentSemester && (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {semesters.map((semester) => {
                  const active = semester.name === currentSemester.name;
                  const chosen = semesterSelectedCount(semester);

                  return (
                    <button
                      key={semester.name}
                      type="button"
                      onClick={() => setActiveSemester(semester.name)}
                      className={`shrink-0 whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-bold transition ${
                        active
                          ? "border-emerald-700 bg-emerald-800 text-white"
                          : "border-stone-200 bg-white text-stone-700 hover:bg-stone-100 dark:border-stone-800 dark:bg-[#1d1c18] dark:text-stone-200 dark:hover:bg-stone-800"
                      }`}
                    >
                      {semester.name}
                      {chosen > 0 && (
                        <span
                          className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${
                            active ? "bg-white/25" : "bg-emerald-600 text-white"
                          }`}
                        >
                          {chosen}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2 text-sm font-bold">
                <button
                  type="button"
                  onClick={() => setSemesterSelection(currentSemester, true)}
                  className="rounded-lg border border-stone-200 px-3 py-1.5 text-stone-700 transition hover:bg-stone-100 dark:border-stone-800 dark:text-stone-200 dark:hover:bg-stone-800"
                >
                  Tout le semestre
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  disabled={selected.size === 0}
                  className="rounded-lg border border-stone-200 px-3 py-1.5 text-stone-700 transition hover:bg-stone-100 disabled:opacity-40 dark:border-stone-800 dark:text-stone-200 dark:hover:bg-stone-800"
                >
                  Tout effacer
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {currentSemester.subjects.map((subject) => (
                <SubjectToggle
                  key={subject.slug}
                  subject={subject}
                  selected={selected.has(subject.slug)}
                  onToggle={() => toggleSubject(subject.slug)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur dark:border-stone-800 dark:bg-[#151512]/95">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-5">
            <div className="flex items-center gap-1.5" role="group" aria-label="Nombre de questions">
              {CUSTOM_SESSION_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setCount(size)}
                  aria-pressed={count === size}
                  className={`rounded-md border px-2.5 py-1 text-sm font-bold transition ${
                    count === size
                      ? "border-emerald-700 bg-emerald-800 text-white"
                      : "border-stone-200 text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                  }`}
                >
                  {size}
                </button>
              ))}
              <span className="ml-1 text-xs font-semibold text-stone-500 dark:text-stone-400">
                questions
              </span>
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold text-stone-600 dark:text-stone-300">
              <Timer className="h-4 w-4" />
              <select
                value={timeLimit ?? ""}
                onChange={(event) =>
                  setTimeLimit(event.target.value === "" ? null : Number(event.target.value))
                }
                className="rounded-md border border-stone-200 bg-white px-2 py-1 text-sm font-bold text-stone-800 dark:border-stone-700 dark:bg-[#1d1c18] dark:text-stone-100"
              >
                {CUSTOM_SESSION_TIME_LIMITS.map((limit) => (
                  <option key={limit ?? "none"} value={limit ?? ""}>
                    {formatTimeLimit(limit)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex items-center justify-between gap-4 lg:justify-end">
            <p className="text-sm text-stone-600 dark:text-stone-300">
              {selectedSubjects.length === 0 ? (
                "Choisis au moins une matière"
              ) : (
                <>
                  <span className="font-black">{selectedSubjects.length}</span>{" "}
                  {plural(selectedSubjects.length, "matière")} ·{" "}
                  <span className="font-black">{availableQuestions}</span> questions disponibles
                </>
              )}
            </p>

            <button
              type="button"
              onClick={startSession}
              disabled={effectiveCount === 0 || starting}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-emerald-800 px-5 py-2.5 font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {starting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {starting ? "Tirage..." : `Lancer (${effectiveCount})`}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
