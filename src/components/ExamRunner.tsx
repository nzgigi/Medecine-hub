"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUp,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderOpen,
  Lock,
  Menu,
  RotateCcw,
  Send,
  Timer,
  X,
} from "lucide-react";
import type {
  ExamData,
  ExamScoreResult,
  ExamFolder,
  FolderSubmissions,
  LockedQuestions,
  Question,
  UserAnswers,
} from "@/types/exam";
import { getExamScore } from "@/lib/exam/scoring";
import {
  hasAnswer,
  QuestionAnswerInput,
  QuestionBadges,
  QuestionCorrection,
  QuestionStatement,
} from "@/components/QuestionView";
import ThemeToggle from "@/components/ThemeToggle";
import { useDialogs } from "@/components/DialogProvider";
import ReportQuestionButton from "@/components/ReportQuestionButton";
import ShareScoreButton from "@/components/ShareScoreButton";
import DiscordBanner from "@/components/DiscordBanner";
import { recordOutcomes, type QuestionOutcome } from "@/lib/exam/mistakes";
import { privateQuestionKey } from "@/lib/exam/privateTraining";
import { recordPrivateOutcomes } from "@/lib/exam/privateClient";
import type { QuestionOrigin } from "@/lib/exam/practiceSession";

interface SavedExamAttempt {
  userAnswers: UserAnswers;
  folderSubmissions: FolderSubmissions;
  lockedQuestions: LockedQuestions;
  currentFolderIndex: number;
  currentQuestionIndex: number;
  updatedAt: string;
}

interface QcmHistoryItem {
  matiere: string;
  annee: number;
  score: number;
  total: number;
  date: string;
}

const ICON_BUTTON_CLASSES =
  "rounded-lg border border-stone-200 bg-white p-2 text-stone-600 transition-colors hover:bg-stone-100 dark:border-stone-800 dark:bg-[#151512] dark:text-stone-300 dark:hover:bg-[#1d1c18]";

const ICON_BUTTON_ACTIVE_CLASSES =
  "rounded-lg border border-emerald-700 bg-emerald-50 p-2 text-emerald-800 transition-colors hover:bg-emerald-100 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60";


function getFolderTypeLabel(type: ExamFolder["type"]) {
  if (type === "DP") return "Dossier progressif";
  if (type === "SQI") return "Séquence de questions isolées";
  return "Key Features Problem";
}

function getFolderStatus(
  folder: ExamFolder,
  userAnswers: UserAnswers,
  folderSubmissions: FolderSubmissions
) {
  if (folderSubmissions[folder.id]) return "Soumis";

  const answered = folder.questions.some((question) =>
    hasAnswer(question, userAnswers[question.id])
  );

  return answered ? "En cours" : "Non commencé";
}

function getFolderStatusClasses(status: string) {
  if (status === "Soumis") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
  }

  if (status === "En cours") {
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  }

  return "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300";
}

function getAnsweredQuestionsCount(folder: ExamFolder, userAnswers: UserAnswers) {
  return folder.questions.filter((question) =>
    hasAnswer(question, userAnswers[question.id])
  ).length;
}

function getUnansweredQuestions(folder: ExamFolder, userAnswers: UserAnswers) {
  return folder.questions.filter(
    (question) => !hasAnswer(question, userAnswers[question.id])
  );
}

function getProgressPercent(answered: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((answered / total) * 100);
}

function formatClock(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Compte à rebours jusqu'à `deadline` ; appelle `onExpire` une seule fois à zéro. */
function ExamTimer({ deadline, onExpire }: { deadline: number; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, deadline - Date.now()));
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    let fired = false;

    const tick = () => {
      const left = Math.max(0, deadline - Date.now());
      setRemaining(left);

      if (left === 0 && !fired) {
        fired = true;
        onExpireRef.current();
      }
    };

    // Premier passage hors du corps de l'effet : une échéance déjà dépassée (reprise) se déclenche aussitôt.
    const first = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);

    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [deadline]);

  const urgent = remaining <= 60_000;
  const warning = remaining <= 5 * 60_000;

  return (
    <span
      role="timer"
      aria-label="Temps restant"
      className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-black tabular-nums ${
        urgent
          ? "animate-pulse bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
          : warning
          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
          : "bg-stone-100 text-stone-600 dark:bg-[#1d1c18] dark:text-stone-300"
      }`}
    >
      <Timer className="h-3 w-3" />
      {formatClock(remaining)}
    </span>
  );
}

export interface LoadedExam {
  exam: ExamData;
  /** Séance de révision : provenance de chaque question (id dans la séance -> épreuve d'origine). */
  origins?: Record<number, QuestionOrigin>;
}

interface ExamRunnerProps {
  /**
   * "exam" : épreuve normale (enregistrée dans l'historique et le classement).
   * "practice" : séance de révision (n'alimente que "Mes erreurs").
   */
  mode: "exam" | "practice";
  /** Slug de l'épreuve dans l'URL, utilisé pour le partage de score et "Mes erreurs" (mode "exam"). */
  slug?: string;
  attemptStorageKey: string;
  backHref: string;
  /** Libellé du retour en mode "practice" (ex. "Mes erreurs"). */
  backLabel?: string;
  /** Chrono en minutes ; à zéro, l'épreuve est soumise automatiquement. */
  timeLimitMinutes?: number;
  /**
   * QCM privé (admin) : les résultats alimentent l'historique privé
   * ("Mes erreurs privées", admin) au lieu de celui des annales.
   */
  privateSlug?: string;
  loadExam: () => Promise<LoadedExam>;
}

export default function ExamRunner({
  mode,
  slug,
  attemptStorageKey,
  backHref,
  backLabel = "Mes erreurs",
  timeLimitMinutes,
  privateSlug,
  loadExam,
}: ExamRunnerProps) {
  const router = useRouter();
  const { alert: showAlert, confirm: showConfirm } = useDialogs();
  const isPractice = mode === "practice";

  const [examData, setExamData] = useState<ExamData | null>(null);
  const [origins, setOrigins] = useState<Record<number, QuestionOrigin>>({});
  const [deadline, setDeadline] = useState<number | null>(null);
  const deadlineKey = `${attemptStorageKey}_deadline`;
  const [loading, setLoading] = useState(true);

  const [currentFolderIndex, setCurrentFolderIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const [userAnswers, setUserAnswers] = useState<UserAnswers>({});
  const [folderSubmissions, setFolderSubmissions] =
    useState<FolderSubmissions>({});
  const [lockedQuestions, setLockedQuestions] = useState<LockedQuestions>({});

  const [showResults, setShowResults] = useState(false);
  const [correctionFolderIndex, setCorrectionFolderIndex] = useState(0);
  const [questionsPanelOpen, setQuestionsPanelOpen] = useState(false);
  const [foldersPanelOpen, setFoldersPanelOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const [attemptLoaded, setAttemptLoaded] = useState(false);

  useEffect(() => {
    async function loadQCM() {
      try {
        const { exam: normalizedData, origins: loadedOrigins } = await loadExam();

        setExamData(normalizedData);
        setOrigins(loadedOrigins ?? {});

        const savedAttemptRaw = localStorage.getItem(attemptStorageKey);
        let resumed = false;

        if (savedAttemptRaw) {
          const shouldResume = await showConfirm(
            "Voulez-vous la reprendre ?",
            {
              title: isPractice
                ? "Une séance de révision non terminée a été trouvée."
                : "Une tentative non terminée a été trouvée pour cette épreuve.",
            }
          );

          if (shouldResume) {
            resumed = true;
            const savedAttempt = JSON.parse(
              savedAttemptRaw
            ) as SavedExamAttempt;

            const safeFolderIndex = Math.min(
              savedAttempt.currentFolderIndex || 0,
              Math.max(0, normalizedData.folders.length - 1)
            );

            const safeFolder = normalizedData.folders[safeFolderIndex];
            const safeQuestionIndex = Math.min(
              savedAttempt.currentQuestionIndex || 0,
              Math.max(0, (safeFolder?.questions.length || 1) - 1)
            );

            setUserAnswers(savedAttempt.userAnswers || {});
            setFolderSubmissions(savedAttempt.folderSubmissions || {});
            setLockedQuestions(savedAttempt.lockedQuestions || {});
            setCurrentFolderIndex(safeFolderIndex);
            setCurrentQuestionIndex(safeQuestionIndex);
          } else {
            localStorage.removeItem(attemptStorageKey);
            localStorage.removeItem(deadlineKey);
          }
        }

        if (timeLimitMinutes) {
          // L'échéance est absolue et sauvegardée : recharger la page ne remet pas le chrono à zéro.
          const storedDeadline = Number(localStorage.getItem(deadlineKey));
          const nextDeadline =
            resumed && storedDeadline > 0
              ? storedDeadline
              : Date.now() + timeLimitMinutes * 60_000;

          localStorage.setItem(deadlineKey, String(nextDeadline));
          setDeadline(nextDeadline);
        }
      } catch (error) {
        console.error("Erreur chargement QCM:", error);
      } finally {
        setAttemptLoaded(true);
        setLoading(false);
      }
    }

    loadQCM();
    // loadExam est recréé par l'appelant à chaque rendu : seule la clé de tentative identifie l'épreuve.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptStorageKey]);

  useEffect(() => {
    if (!examData || !attemptLoaded || showResults) return;

    const savedAttempt: SavedExamAttempt = {
      userAnswers,
      folderSubmissions,
      lockedQuestions,
      currentFolderIndex,
      currentQuestionIndex,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(attemptStorageKey, JSON.stringify(savedAttempt));
  }, [
    examData,
    attemptLoaded,
    showResults,
    userAnswers,
    folderSubmissions,
    lockedQuestions,
    currentFolderIndex,
    currentQuestionIndex,
    attemptStorageKey,
  ]);

  const currentFolder = examData?.folders[currentFolderIndex] || null;
  const currentQuestion =
    currentFolder?.questions[currentQuestionIndex] || null;

  const examScore = useMemo(() => {
    if (!examData) return null;
    return getExamScore(examData, userAnswers, folderSubmissions);
  }, [examData, userAnswers, folderSubmissions]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 text-stone-950 dark:bg-[#151512] dark:text-stone-100">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-stone-300 border-b-emerald-800 dark:border-stone-800 dark:border-b-emerald-300" />
          <div className="text-sm font-semibold text-stone-500 dark:text-stone-400">
            Chargement de l&apos;épreuve...
          </div>
        </div>
      </div>
    );
  }

  if (!examData || !currentFolder || !currentQuestion) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4 text-stone-950 dark:bg-[#151512] dark:text-stone-100">
        <div className="max-w-xl rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm dark:border-stone-800 dark:bg-[#151512]">
          <h1 className="mb-3 text-2xl font-black">Épreuve introuvable</h1>
          <p className="mb-6 text-stone-600 dark:text-stone-300">
            {isPractice
              ? "Ces questions ne sont plus disponibles (épreuve modifiée ou supprimée)."
              : "Impossible de charger cette épreuve."}
          </p>

          <Link
            href={backHref}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-5 py-3 font-bold text-white hover:bg-emerald-700"
          >
            <ArrowLeft className="h-4 w-4" />
            {isPractice ? `Retour : ${backLabel}` : "Retour accueil"}
          </Link>
        </div>
      </div>
    );
  }

  const isCurrentFolderSubmitted = Boolean(folderSubmissions[currentFolder.id]);
  const isProgressiveFolder =
    currentFolder.type === "DP" || currentFolder.type === "KFP";
  const isCurrentQuestionLocked = Boolean(lockedQuestions[currentQuestion.id]);

  const totalQuestionsInFolder = currentFolder.questions.length;

  const allFoldersSubmitted = examData.folders.every(
    (folder) => folderSubmissions[folder.id]
  );

  const totalAnsweredQuestions = examData.folders.reduce((acc, folder) => {
    return acc + getAnsweredQuestionsCount(folder, userAnswers);
  }, 0);

  const globalProgressPercent = getProgressPercent(
    totalAnsweredQuestions,
    examData.total_questions
  );

  const examTitle = isPractice
    ? examData.title || examData.matiere
    : `${examData.matiere} — ${examData.annee}`;

  const practiceCorrectCount = examScore
    ? examScore.folders
        .flatMap((folder) => folder.questions)
        .filter((result) => result.isCorrect).length
    : 0;

  const rawCurrentAnswer = userAnswers[currentQuestion.id];
  const currentQuestionAnswered = hasAnswer(currentQuestion, rawCurrentAnswer);

  const handleFolderChange = (folderIndex: number) => {
    setCurrentFolderIndex(folderIndex);
    setCurrentQuestionIndex(0);
  };

  const canAccessQuestion = (folder: ExamFolder, questionIndex: number) => {
    if (folder.type === "SQI") return true;
    if (folderSubmissions[folder.id]) return true;

    const previousQuestions = folder.questions.slice(0, questionIndex);

    return previousQuestions.every((question) => lockedQuestions[question.id]);
  };

  const canGoNext =
    currentQuestionIndex < totalQuestionsInFolder - 1 &&
    canAccessQuestion(currentFolder, currentQuestionIndex + 1);

  const handleQuestionChange = (questionIndex: number) => {
    if (!canAccessQuestion(currentFolder, questionIndex)) return;

    setCurrentQuestionIndex(questionIndex);
    setQuestionsPanelOpen(false);
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      handleQuestionChange(currentQuestionIndex - 1);
      return;
    }

    if (currentFolderIndex > 0) {
      const previousFolder = examData.folders[currentFolderIndex - 1];
      setCurrentFolderIndex(currentFolderIndex - 1);
      setCurrentQuestionIndex(Math.max(0, previousFolder.questions.length - 1));
    }
  };

  const handleNext = () => {
    if (!canGoNext) return;

    const nextQuestionIndex = currentQuestionIndex + 1;

    setCurrentQuestionIndex(nextQuestionIndex);
  };

  const validateProgressiveQuestion = async () => {
    const answer = userAnswers[currentQuestion.id];

    if (!hasAnswer(currentQuestion, answer)) {
      await showAlert(
        "Vous devez répondre à cette question avant de la valider.\n\nEn DP/KFP, une question validée est verrouillée."
      );
      return;
    }

    setLockedQuestions({
      ...lockedQuestions,
      [currentQuestion.id]: true,
    });

    if (currentQuestionIndex < totalQuestionsInFolder - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const submitFolder = async () => {
    const unansweredQuestions = getUnansweredQuestions(
      currentFolder,
      userAnswers
    );

    const warning =
      unansweredQuestions.length > 0
        ? `Attention : ${unansweredQuestions.length} question(s) de ce dossier n'ont pas de réponse.`
        : undefined;

    const confirmed = await showConfirm(
      "Une fois soumis, vous ne pourrez plus modifier vos réponses pour ce dossier.",
      { detail: warning, confirmLabel: "Soumettre" }
    );

    if (!confirmed) return;

    const folderQuestionLocks = currentFolder.questions.reduce<LockedQuestions>(
      (acc, question) => {
        acc[question.id] = true;
        return acc;
      },
      {}
    );

    setLockedQuestions({
      ...lockedQuestions,
      ...folderQuestionLocks,
    });

    setFolderSubmissions({
      ...folderSubmissions,
      [currentFolder.id]: true,
    });
  };

  const resetAttempt = async () => {
    if (
      !(await showConfirm(
        "Toutes vos réponses locales seront supprimées pour cette épreuve.",
        { title: "Effacer la tentative en cours ?", danger: true, confirmLabel: "Effacer" }
      ))
    ) {
      return;
    }

    localStorage.removeItem(attemptStorageKey);

    if (timeLimitMinutes) {
      const nextDeadline = Date.now() + timeLimitMinutes * 60_000;
      localStorage.setItem(deadlineKey, String(nextDeadline));
      setDeadline(nextDeadline);
    }

    setUserAnswers({});
    setFolderSubmissions({});
    setLockedQuestions({});
    setCurrentFolderIndex(0);
    setCurrentQuestionIndex(0);
    setShowResults(false);
  };

  /** Provenance d'une question : l'épreuve courante, ou l'épreuve d'origine en séance de révision. */
  const originOf = (question: Question): QuestionOrigin => {
    const origin = origins[question.id];
    if (origin) return origin;

    return {
      slug: slug ?? "",
      annee: examData.annee,
      questionId: question.id,
      matiere: examData.matiere,
    };
  };

  /** Enregistre le résultat de chaque question des dossiers soumis (un dossier non soumis n'est pas compté comme raté). */
  const recordResults = (score: ExamScoreResult | null = examScore) => {
    if (!score) return;

    const questionsById = new Map(
      examData.folders.flatMap((folder) =>
        folder.questions.map((q) => [q.id, { question: q, folder }] as const)
      )
    );

    const submitted = score.folders
      .filter((folder) => folder.submitted)
      .flatMap((folder) => folder.questions);

    if (privateSlug) {
      void recordPrivateOutcomes(
        submitted.flatMap((result) => {
          const found = questionsById.get(result.questionId);
          if (!found) return [];

          return [
            {
              key: privateQuestionKey(privateSlug, found.folder.title, found.question.question),
              slug: privateSlug,
              annee: examData.annee,
              matiere: examData.matiere,
              folderTitle: found.folder.title,
              questionText: found.question.question,
              correct: result.isCorrect,
            },
          ];
        })
      );
      return;
    }

    const outcomes: QuestionOutcome[] = submitted.flatMap((result) => {
      const found = questionsById.get(result.questionId);
      if (!found) return [];

      const origin = originOf(found.question);
      if (!origin.slug) return [];

      return [
        {
          slug: origin.slug,
          annee: origin.annee,
          questionId: origin.questionId,
          matiere: origin.matiere,
          questionText: found.question.question,
          correct: result.isCorrect,
        },
      ];
    });

    recordOutcomes(outcomes);
  };

  /** Temps écoulé : tous les dossiers sont soumis tels quels, sans confirmation. */
  const autoFinish = () => {
    if (showResults) return;

    const allSubmitted: FolderSubmissions = {};
    for (const folder of examData.folders) allSubmitted[folder.id] = true;

    const allLocked: LockedQuestions = {};
    for (const folder of examData.folders) {
      for (const question of folder.questions) allLocked[question.id] = true;
    }

    recordResults(getExamScore(examData, userAnswers, allSubmitted));
    localStorage.removeItem(attemptStorageKey);
    localStorage.removeItem(deadlineKey);

    setFolderSubmissions(allSubmitted);
    setLockedQuestions(allLocked);
    setCorrectionFolderIndex(0);
    setShowResults(true);

    void showAlert("Temps écoulé : ta séance a été soumise automatiquement.");
  };

  const submitExam = async () => {
    const notSubmittedFolders = examData.folders.filter(
      (folder) => !folderSubmissions[folder.id]
    );

    if (notSubmittedFolders.length > 0) {
      const folderNames = notSubmittedFolders
        .map((folder) => `- ${folder.title}`)
        .join("\n");

      const confirmed = await showConfirm(
        "Certains dossiers ne sont pas soumis et compteront 0 dans la note finale. Voulez-vous quand même soumettre l’épreuve ?",
        { detail: folderNames, danger: true, confirmLabel: "Soumettre quand même" }
      );

      if (!confirmed) return;
    }

    if (!isPractice) {
      const result: QcmHistoryItem = {
        matiere: examData.matiere,
        annee: examData.annee,
        score: examScore?.finalScoreOn20 ?? 0,
        total: 20,
        date: new Date().toISOString(),
      };

      const history = JSON.parse(
        localStorage.getItem("qcm_history") || "[]"
      ) as QcmHistoryItem[];

      history.push(result);
      localStorage.setItem("qcm_history", JSON.stringify(history));
    }

    recordResults();
    localStorage.removeItem(attemptStorageKey);
    localStorage.removeItem(deadlineKey);

    setCorrectionFolderIndex(0);
    setShowResults(true);
  };

  const renderCorrectionQuestion = (
    question: Question,
    folderSubmitted: boolean,
    questionNumber: number
  ) => (
    <QuestionCorrection
      key={question.id}
      question={question}
      answer={userAnswers[question.id]}
      scored={folderSubmitted}
      questionNumber={questionNumber}
      origin={originOf(question)}
    />
  );

  const questionsDrawer = (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-lg font-black">Questions</div>
        <button
          onClick={() => setQuestionsPanelOpen(false)}
          aria-label="Fermer"
          className="lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {currentFolder.questions.map((question, index) => {
          const answered = hasAnswer(question, userAnswers[question.id]);
          const locked = Boolean(lockedQuestions[question.id]);
          const active = index === currentQuestionIndex;
          const accessible = canAccessQuestion(currentFolder, index);

          return (
            <button
              key={question.id}
              onClick={() => handleQuestionChange(index)}
              disabled={!accessible}
              className={`relative h-10 rounded-lg border text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                active
                  ? "border-emerald-700 bg-emerald-700 text-white dark:border-emerald-500 dark:bg-emerald-600"
                  : answered
                  ? "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : "border-stone-200 bg-stone-100 text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
              }`}
            >
              {index + 1}
              {locked && (
                <Lock className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-white dark:bg-[#151512]" />
              )}
            </button>
          );
        })}
      </div>
    </>
  );

  const foldersDrawer = (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-lg font-black">Dossiers</div>
        <button
          onClick={() => setFoldersPanelOpen(false)}
          aria-label="Fermer"
          className="lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-2">
        {examData.folders.map((folder, index) => {
          const status = getFolderStatus(folder, userAnswers, folderSubmissions);
          const answeredCount = getAnsweredQuestionsCount(folder, userAnswers);
          const folderProgressPercent = getProgressPercent(
            answeredCount,
            folder.questions.length
          );

          return (
            <button
              key={folder.id}
              onClick={() => handleFolderChange(index)}
              className={`w-full rounded-lg border p-3 text-left transition ${
                index === currentFolderIndex
                  ? "border-emerald-600 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/30"
                  : "border-stone-200 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-[#1d1c18]"
              }`}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  {folder.type}
                </div>

                <div
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getFolderStatusClasses(
                    status
                  )}`}
                >
                  {status}
                </div>
              </div>

              <div className="text-sm font-semibold">{folder.title}</div>

              <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                {answeredCount}/{folder.questions.length} question(s)
              </div>

              <div className="mt-2 h-1.5 w-full rounded-full bg-stone-200 dark:bg-stone-800">
                <div
                  className="h-1.5 rounded-full bg-emerald-700 transition-all dark:bg-emerald-500"
                  style={{ width: `${folderProgressPercent}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </>
  );

  if (showResults && examScore) {
    return (
      <div className="min-h-screen bg-stone-50 py-8 text-stone-950 dark:bg-[#151512] dark:text-stone-100">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mb-6">
            <button
              onClick={() => router.push(backHref)}
              className="inline-flex items-center gap-2 font-semibold text-emerald-800 hover:underline dark:text-emerald-300"
            >
              <ArrowLeft className="h-4 w-4" />
              {isPractice ? `Retour : ${backLabel}` : "Retour accueil"}
            </button>
          </div>

          <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-[#151512] sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <div className="mb-2 text-sm font-bold text-emerald-800 dark:text-emerald-300">
                  Correction globale
                </div>

                <h1 className="mb-2 text-3xl font-black sm:text-4xl">
                  {examTitle}
                </h1>

                <p className="text-stone-600 dark:text-stone-300">
                  {isPractice
                    ? `${practiceCorrectCount}/${examData.total_questions} question(s) réussie(s). Les questions ratées sont ajoutées à « ${privateSlug ? "Mes erreurs privées" : "Mes erreurs"} » ; celles qui y étaient déjà et que tu as réussies en sont retirées.`
                    : "Seuls les dossiers soumis sont pris en compte dans la note finale."}
                </p>
              </div>

              <div className="flex flex-col items-center gap-3">
                <div className="rounded-2xl bg-emerald-800 px-8 py-6 text-center text-white shadow-sm">
                  <div className="text-5xl font-black">
                    {examScore.finalScoreOn20.toFixed(2)}
                  </div>
                  <div className="text-sm font-semibold opacity-90">/20</div>
                </div>

                {!isPractice && slug && (
                  <ShareScoreButton
                    slug={slug}
                    matiere={examData.matiere}
                    annee={examData.annee}
                    score={examScore.finalScoreOn20}
                  />
                )}
              </div>
            </div>

            <div className={`mt-8 grid gap-4 md:grid-cols-3 ${isPractice ? "hidden" : ""}`}>
              {examScore.categories.map((category) => (
                <div
                  key={category.type}
                  className="rounded-lg border border-stone-200 bg-stone-50 p-5 dark:border-stone-800 dark:bg-[#1d1c18]"
                >
                  <div className="mb-1 font-bold">{category.label}</div>
                  <div className="mb-3 text-sm text-stone-500 dark:text-stone-400">
                    Pondération : {Math.round(category.weight * 100)}%
                  </div>

                  <div className="text-2xl font-black">
                    {category.averageOn20.toFixed(2)}/20
                  </div>

                  <div className="text-sm text-stone-600 dark:text-stone-300">
                    {category.submittedFoldersCount} dossier(s) soumis
                  </div>
                </div>
              ))}
            </div>

            {!allFoldersSubmitted && !isPractice && (
              <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
                Certains dossiers n&apos;ont pas été soumis et comptent donc 0
                pour leur pondération.
              </div>
            )}
          </div>

          {!isPractice && <DiscordBanner variant="compact" className="mb-6" />}

          <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-[#151512]">
            <div className="mb-4 flex items-center gap-2 font-bold">
              <FolderOpen className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
              Dossiers
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {examData.folders.map((folder, index) => (
                <button
                  key={folder.id}
                  onClick={() => setCorrectionFolderIndex(index)}
                  className={`rounded-lg border p-3 text-left transition ${
                    index === correctionFolderIndex
                      ? "border-emerald-600 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/30"
                      : "border-stone-200 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-[#1d1c18]"
                  }`}
                >
                  <div className="mb-1 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    {folder.type} - {getFolderTypeLabel(folder.type)}
                  </div>
                  <div className="line-clamp-2 text-sm font-semibold">
                    {folder.title}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            {examData.folders
              .filter((_, index) => index === correctionFolderIndex)
              .map((folder) => {
                const folderScore = examScore.folders.find(
                  (item) => item.folderId === folder.id
                );

                const folderSubmitted = Boolean(folderSubmissions[folder.id]);

                return (
                  <div
                    key={folder.id}
                    className="rounded-2xl border border-stone-200 bg-stone-100 p-5 dark:border-stone-800 dark:bg-[#1d1c18]/60"
                  >
                    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="mb-1 text-sm font-bold text-emerald-800 dark:text-emerald-300">
                          {folder.type} • {getFolderTypeLabel(folder.type)}
                        </div>

                        <h2 className="text-2xl font-black">{folder.title}</h2>

                        <div className="mt-2 text-sm text-stone-600 dark:text-stone-300">
                          Statut :{" "}
                          <span className="font-semibold">
                            {folderSubmitted ? "soumis" : "non soumis"}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-lg border border-stone-200 bg-white px-5 py-3 shadow-sm dark:border-stone-800 dark:bg-[#151512]">
                        <div className="text-sm text-stone-500 dark:text-stone-400">
                          Note dossier
                        </div>
                        <div className="text-2xl font-black">
                          {folderSubmitted && folderScore
                            ? `${folderScore.scoreOn20.toFixed(2)}/20`
                            : "Non soumis"}
                        </div>
                      </div>
                    </div>

                    {folder.description && (
                      <div className="mb-5 whitespace-pre-wrap rounded-lg border-l-4 border-stone-300 bg-white p-4 text-sm text-stone-700 dark:border-stone-700 dark:bg-[#151512] dark:text-stone-200">
                        {folder.description}
                      </div>
                    )}

                    <div className="space-y-4">
                      {folder.questions.map((question, questionIndex) =>
                        renderCorrectionQuestion(
                          question,
                          folderSubmitted,
                          questionIndex + 1
                        )
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Remonter en haut de page"
          title="Remonter en haut"
          className="fixed bottom-6 right-6 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-800 text-white shadow-lg transition-colors hover:bg-emerald-700"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-950 dark:bg-[#151512] dark:text-stone-100">
      <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/95 backdrop-blur dark:border-stone-800 dark:bg-[#151512]/95">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
          <Link
            href={backHref}
            aria-label={isPractice ? `Retour : ${backLabel}` : "Retour à l'accueil"}
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-bold text-stone-600 transition-colors hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-[#1d1c18]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{isPractice ? backLabel : "Accueil"}</span>
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-black">
                {examTitle}
              </p>
              <div className="flex shrink-0 items-center gap-2">
                {deadline !== null && <ExamTimer deadline={deadline} onExpire={autoFinish} />}
                <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                  {totalAnsweredQuestions}/{examData.total_questions}
                </p>
              </div>
            </div>

            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-[#1d1c18]">
              <div
                className="h-full rounded-full bg-emerald-700 transition-all dark:bg-emerald-500"
                style={{ width: `${globalProgressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={() => setQuestionsPanelOpen((current) => !current)}
              className={`lg:hidden ${
                questionsPanelOpen
                  ? ICON_BUTTON_ACTIVE_CLASSES
                  : ICON_BUTTON_CLASSES
              }`}
              aria-label="Afficher/masquer les questions"
              title="Questions"
            >
              <Menu className="h-4 w-4" />
            </button>

            <button
              onClick={() => setFoldersPanelOpen((current) => !current)}
              className={`lg:hidden ${
                foldersPanelOpen
                  ? ICON_BUTTON_ACTIVE_CLASSES
                  : ICON_BUTTON_CLASSES
              }`}
              aria-label="Afficher/masquer les dossiers"
              title="Dossiers"
            >
              <FolderOpen className="h-4 w-4" />
            </button>

            <ThemeToggle variant="icon" />

            <button
              onClick={resetAttempt}
              className={ICON_BUTTON_CLASSES}
              aria-label="Réinitialiser la tentative"
              title="Réinitialiser"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <button
              onClick={submitExam}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-800 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-700 sm:text-sm"
            >
              <Send className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Soumettre</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8 lg:grid lg:grid-cols-[260px_1fr_260px] lg:items-start lg:gap-6">
        <aside className="hidden lg:sticky lg:top-20 lg:block lg:rounded-2xl lg:border lg:border-stone-200 lg:bg-white lg:p-5 lg:shadow-sm dark:lg:border-stone-800 dark:lg:bg-[#151512]">
          {questionsDrawer}
        </aside>

        <main className="mx-auto max-w-3xl">
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-[#151512]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 px-5 py-3 dark:border-stone-900">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-stone-100 px-2 py-1 text-xs font-black uppercase tracking-wide text-stone-600 dark:bg-[#1d1c18] dark:text-stone-300">
                <FileText className="h-3.5 w-3.5" />
                {currentFolder.type}
              </span>
              <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                {privateSlug ? `${originOf(currentQuestion).matiere} · ` : `${currentFolder.title} · `}
                Question {currentQuestionIndex + 1}/{totalQuestionsInFolder}
              </span>
              <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-bold text-stone-600 dark:bg-[#1d1c18] dark:text-stone-300">
                {currentQuestion.type}
                {currentQuestion.type === "QRP" &&
                  currentQuestion.maxReponses && (
                    <> · {currentQuestion.maxReponses} rép. attendues</>
                  )}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {isCurrentFolderSubmitted && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Soumis
                </span>
              )}
              {currentQuestionAnswered ? (
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  Répondu
                </span>
              ) : (
                <span className="text-xs font-semibold text-stone-400 dark:text-stone-500">
                  En attente
                </span>
              )}
              <QuestionBadges question={currentQuestion} />
              <ReportQuestionButton
                matiere={originOf(currentQuestion).matiere}
                annee={originOf(currentQuestion).annee}
                questionId={originOf(currentQuestion).questionId}
                questionText={currentQuestion.question}
              />
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <QuestionStatement
              question={currentQuestion}
              folderDescription={currentFolder.description}
              onImageClick={setLightboxImage}
            />

            <QuestionAnswerInput
              question={currentQuestion}
              answer={rawCurrentAnswer}
              locked={isCurrentFolderSubmitted || isCurrentQuestionLocked}
              onChange={(answer) =>
                setUserAnswers((current) => ({ ...current, [currentQuestion.id]: answer }))
              }
            />
          </div>
        </div>

        {(isProgressiveFolder || !isCurrentFolderSubmitted) && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-stone-200 bg-white p-3.5 shadow-sm dark:border-stone-800 dark:bg-[#151512]">
            {isProgressiveFolder &&
              !isCurrentFolderSubmitted &&
              !isCurrentQuestionLocked && (
                <button
                  onClick={validateProgressiveQuestion}
                  disabled={!currentQuestionAnswered}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-5 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  title={
                    currentQuestionAnswered
                      ? "Valider et verrouiller cette question"
                      : "Répondez d'abord à la question"
                  }
                >
                  <Lock className="h-4 w-4" />
                  Valider la question
                </button>
              )}

            {!isCurrentFolderSubmitted && (
              <button
                onClick={submitFolder}
                className="inline-flex items-center gap-2 rounded-lg bg-stone-800 px-5 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-950 dark:hover:bg-white"
              >
                <CheckCircle className="h-4 w-4" />
                Soumettre le dossier
              </button>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            onClick={handlePrevious}
            disabled={currentFolderIndex === 0 && currentQuestionIndex === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-stone-200 px-5 py-2.5 font-semibold text-stone-700 transition-colors hover:bg-stone-300 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#1d1c18] dark:text-stone-200 dark:hover:bg-stone-800"
          >
            <ChevronLeft className="h-4 w-4" />
            Précédent
          </button>

          <button
            onClick={handleNext}
            disabled={!canGoNext}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Suivant
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        </main>

        <aside className="hidden lg:sticky lg:top-20 lg:block lg:rounded-2xl lg:border lg:border-stone-200 lg:bg-white lg:p-5 lg:shadow-sm dark:lg:border-stone-800 dark:lg:bg-[#151512]">
          {foldersDrawer}
        </aside>
      </div>

      {questionsPanelOpen && (
        <div className="fixed left-0 top-14 bottom-0 z-40 w-80 max-w-[85vw] overflow-y-auto border-r border-stone-200 bg-white/98 p-5 shadow-2xl backdrop-blur dark:border-stone-800 dark:bg-[#151512]/98 lg:hidden">
          {questionsDrawer}
        </div>
      )}

      {foldersPanelOpen && (
        <div className="fixed right-0 top-14 bottom-0 z-40 w-80 max-w-[85vw] overflow-y-auto border-l border-stone-200 bg-white/98 p-5 shadow-2xl backdrop-blur dark:border-stone-800 dark:bg-[#151512]/98 lg:hidden">
          {foldersDrawer}
        </div>
      )}

      {lightboxImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute right-4 top-4 rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            aria-label="Fermer l'image"
          >
            <X className="h-6 w-6" />
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxImage}
            alt="Illustration en plein écran"
            className="max-h-[90vh] max-w-[90vw] cursor-zoom-out rounded-lg object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
