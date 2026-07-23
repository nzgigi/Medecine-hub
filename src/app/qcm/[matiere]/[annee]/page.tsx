"use client";

import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FileText,
  FolderOpen,
  Lock,
  Menu,
  RotateCcw,
  Send,
  X,
} from "lucide-react";
import type {
  ExamData,
  ExamFolder,
  FolderSubmissions,
  LockedQuestions,
  Question,
  UserAnswer,
  UserAnswers,
} from "@/types/exam";
import { normalizeExamData } from "@/lib/exam/normalizeExam";
import {
  getExamScore,
  getQuestionScore,
  violatesCritique,
} from "@/lib/exam/scoring";
import { isQrocAnswerCorrect } from "@/lib/exam/qroc";
import ThemeToggle from "@/components/ThemeToggle";

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
  "rounded-lg border border-stone-200 bg-white p-2 text-stone-600 transition-colors hover:bg-stone-100 dark:border-stone-800 dark:bg-black dark:text-stone-300 dark:hover:bg-stone-900";

const CONTEXT_COLLAPSE_THRESHOLD = 260;

function getFolderTypeLabel(type: ExamFolder["type"]) {
  if (type === "DP") return "Dossier progressif";
  if (type === "SQI") return "Séquence de questions isolées";
  return "Key Features Problem";
}

function hasAnswer(question: Question, answer: UserAnswer | undefined) {
  if (question.type === "QROC") {
    return typeof answer === "string" && answer.trim().length > 0;
  }

  return Array.isArray(answer) && answer.length > 0;
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

function getChoiceLetter(choice: string) {
  return choice.charAt(0);
}

function handleQuestionImageError(event: SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.style.display = "none";
  const placeholder =
    event.currentTarget.nextElementSibling as HTMLElement | null;
  if (placeholder) placeholder.style.display = "flex";
}

function QuestionContextBlock({ text }: { text: string }) {
  const isLong = text.length > CONTEXT_COLLAPSE_THRESHOLD;
  const [expanded, setExpanded] = useState(!isLong);

  return (
    <div className="mb-5 overflow-hidden rounded-lg border border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-stone-900">
      <div
        className={`px-4 py-3 text-sm leading-6 text-stone-700 whitespace-pre-wrap dark:text-stone-200 ${
          !expanded ? "line-clamp-4" : ""
        }`}
      >
        {text}
      </div>

      {isLong && (
        <button
          onClick={() => setExpanded((current) => !current)}
          className="flex w-full items-center justify-center gap-1 border-t border-stone-200 py-1.5 text-xs font-bold text-stone-500 transition-colors hover:text-emerald-700 dark:border-stone-800 dark:text-stone-400 dark:hover:text-emerald-300"
        >
          {expanded ? (
            <>
              Réduire le contexte
              <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Voir tout le contexte
              <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}

export default function QCMPage() {
  const params = useParams();
  const router = useRouter();

  const matiere = params.matiere as string;
  const annee = params.annee as string;
  const attemptStorageKey = `exam_attempt_${matiere}_${annee}`;

  const [examData, setExamData] = useState<ExamData | null>(null);
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

  const [attemptLoaded, setAttemptLoaded] = useState(false);

  useEffect(() => {
    async function loadQCM() {
      try {
        const response = await fetch(`/data/qcm/${matiere}_${annee}.json`);

        if (!response.ok) {
          throw new Error("Impossible de charger le fichier QCM");
        }

        const rawData = (await response.json()) as ExamData;
        const normalizedData = normalizeExamData(rawData);

        setExamData(normalizedData);

        const savedAttemptRaw = localStorage.getItem(attemptStorageKey);

        if (savedAttemptRaw) {
          const shouldResume = confirm(
            "Une tentative non terminée a été trouvée pour cette épreuve.\n\nVoulez-vous la reprendre ?"
          );

          if (shouldResume) {
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
          }
        }
      } catch (error) {
        console.error("Erreur chargement QCM:", error);
      } finally {
        setAttemptLoaded(true);
        setLoading(false);
      }
    }

    loadQCM();
  }, [matiere, annee, attemptStorageKey]);

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
      <div className="flex min-h-screen items-center justify-center bg-stone-50 text-stone-950 dark:bg-black dark:text-stone-100">
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
      <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4 text-stone-950 dark:bg-black dark:text-stone-100">
        <div className="max-w-xl rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm dark:border-stone-800 dark:bg-stone-950">
          <h1 className="mb-3 text-2xl font-black">Épreuve introuvable</h1>
          <p className="mb-6 text-stone-600 dark:text-stone-300">
            Impossible de charger cette épreuve.
          </p>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-5 py-3 font-bold text-white hover:bg-emerald-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour accueil
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

  const rawCurrentAnswer = userAnswers[currentQuestion.id];
  const currentQuestionAnswered = hasAnswer(currentQuestion, rawCurrentAnswer);

  const handleFolderChange = (folderIndex: number) => {
    setCurrentFolderIndex(folderIndex);
    setCurrentQuestionIndex(0);
    setQuestionsPanelOpen(false);
    setFoldersPanelOpen(false);
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

  const handleAnswerSelect = (choiceLetter: string) => {
    if (isCurrentFolderSubmitted || isCurrentQuestionLocked) return;
    if (currentQuestion.type === "QROC") return;

    const currentRawAnswer = userAnswers[currentQuestion.id];
    const currentAnswers = Array.isArray(currentRawAnswer)
      ? currentRawAnswer
      : [];

    if (currentQuestion.type === "QRU") {
      setUserAnswers({
        ...userAnswers,
        [currentQuestion.id]: [choiceLetter],
      });
      return;
    }

    if (currentQuestion.type === "QRP") {
      const max = currentQuestion.maxReponses || 3;

      if (currentAnswers.includes(choiceLetter)) {
        setUserAnswers({
          ...userAnswers,
          [currentQuestion.id]: currentAnswers.filter(
            (item) => item !== choiceLetter
          ),
        });
        return;
      }

      if (currentAnswers.length >= max) return;

      setUserAnswers({
        ...userAnswers,
        [currentQuestion.id]: [...currentAnswers, choiceLetter],
      });
      return;
    }

    if (currentAnswers.includes(choiceLetter)) {
      setUserAnswers({
        ...userAnswers,
        [currentQuestion.id]: currentAnswers.filter(
          (item) => item !== choiceLetter
        ),
      });
      return;
    }

    setUserAnswers({
      ...userAnswers,
      [currentQuestion.id]: [...currentAnswers, choiceLetter],
    });
  };

  const handleQrocChange = (value: string) => {
    if (isCurrentFolderSubmitted || isCurrentQuestionLocked) return;

    setUserAnswers({
      ...userAnswers,
      [currentQuestion.id]: value,
    });
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

  const validateProgressiveQuestion = () => {
    const answer = userAnswers[currentQuestion.id];

    if (!hasAnswer(currentQuestion, answer)) {
      alert(
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

  const submitFolder = () => {
    const unansweredQuestions = getUnansweredQuestions(
      currentFolder,
      userAnswers
    );

    const warning =
      unansweredQuestions.length > 0
        ? `\n\nAttention : ${unansweredQuestions.length} question(s) de ce dossier n'ont pas de réponse.`
        : "";

    const confirmed = confirm(
      `Une fois soumis, vous ne pourrez plus modifier vos réponses pour ce dossier.${warning}`
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

  const resetAttempt = () => {
    if (
      !confirm(
        "Effacer la tentative en cours ?\n\nToutes vos réponses locales seront supprimées pour cette épreuve."
      )
    ) {
      return;
    }

    localStorage.removeItem(attemptStorageKey);
    setUserAnswers({});
    setFolderSubmissions({});
    setLockedQuestions({});
    setCurrentFolderIndex(0);
    setCurrentQuestionIndex(0);
    setShowResults(false);
  };

  const submitExam = () => {
    const notSubmittedFolders = examData.folders.filter(
      (folder) => !folderSubmissions[folder.id]
    );

    if (notSubmittedFolders.length > 0) {
      const folderNames = notSubmittedFolders
        .map((folder) => `- ${folder.title}`)
        .join("\n");

      const confirmed = confirm(
        `Certains dossiers ne sont pas soumis et compteront 0 dans la note finale :\n\n${folderNames}\n\nVoulez-vous quand même soumettre l’épreuve ?`
      );

      if (!confirmed) return;
    }

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
    localStorage.removeItem(attemptStorageKey);

    setCorrectionFolderIndex(0);
    setShowResults(true);
  };

  const renderQuestionContent = () => {
    const rawAnswer = userAnswers[currentQuestion.id];

    if (currentQuestion.type === "QROC") {
      const qrocValue = typeof rawAnswer === "string" ? rawAnswer : "";

      return (
        <div className="space-y-3">
          <input
            type="text"
            value={qrocValue}
            onChange={(event) => handleQrocChange(event.target.value)}
            disabled={isCurrentFolderSubmitted || isCurrentQuestionLocked}
            className="w-full rounded-lg border-2 border-stone-200 bg-white p-3 text-stone-950 focus:border-emerald-600 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
            placeholder="Tapez votre réponse courte ici"
          />

          {(isCurrentFolderSubmitted || isCurrentQuestionLocked) && (
            <div className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
              <Lock className="h-4 w-4" />
              Réponse verrouillée
            </div>
          )}
        </div>
      );
    }

    const selectedAnswers = Array.isArray(rawAnswer) ? rawAnswer : [];

    return (
      <div className="space-y-2.5">
        {currentQuestion.choix.map((choice) => {
          const letter = getChoiceLetter(choice);
          const isSelected = selectedAnswers.includes(letter);

          return (
            <button
              key={choice}
              onClick={() => handleAnswerSelect(letter)}
              disabled={isCurrentFolderSubmitted || isCurrentQuestionLocked}
              className={`flex w-full items-center justify-between gap-3 rounded-lg border-2 p-3.5 text-left transition-all disabled:cursor-not-allowed ${
                isSelected
                  ? "border-emerald-700 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-950/40 dark:ring-2 dark:ring-emerald-400/30"
                  : "border-stone-200 bg-white hover:border-emerald-300 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-950 dark:hover:border-emerald-600 dark:hover:bg-stone-900"
              } ${
                isCurrentFolderSubmitted || isCurrentQuestionLocked
                  ? "opacity-70"
                  : ""
              }`}
            >
              <span className="font-medium">{choice}</span>
              {isSelected && (
                <CheckCircle className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" />
              )}
            </button>
          );
        })}

        {(isCurrentFolderSubmitted || isCurrentQuestionLocked) && (
          <div className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
            <Lock className="h-4 w-4" />
            Réponse verrouillée
          </div>
        )}
      </div>
    );
  };

  const renderCorrectionQuestion = (
    question: Question,
    folderSubmitted: boolean,
    questionNumber: number
  ) => {
    const answer = userAnswers[question.id];
    const score = getQuestionScore(question, answer);

    const userAnswerArray = Array.isArray(answer) ? answer : [];
    const userQrocAnswer = typeof answer === "string" ? answer : "";
    const critiqueViolated =
      question.type !== "QROC" && violatesCritique(question, userAnswerArray);

    return (
      <div
        key={question.id}
        className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-950 sm:p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="mb-1 text-sm font-bold text-emerald-800 dark:text-emerald-300">
              Question {questionNumber} • {question.type}
            </div>
            <h3 className="font-black whitespace-pre-wrap text-stone-950 dark:text-stone-100">
              {question.question}
            </h3>
          </div>

          <div
            className={`rounded-full px-3 py-1 text-sm font-bold ${
              score === 1
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                : score > 0
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
            }`}
          >
            {folderSubmitted ? `${score.toFixed(2)} / 1` : "Non soumis"}
          </div>
        </div>

        {question.contexte && (
          <div className="mb-4 whitespace-pre-wrap rounded-lg border-l-4 border-emerald-300 bg-stone-50 p-4 text-sm text-stone-700 dark:border-emerald-700 dark:bg-stone-900 dark:text-stone-200">
            {question.contexte}
          </div>
        )}

        {question.image && (
          <div className="mb-4 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={question.image}
              alt={`Illustration Q${question.id}`}
              className="max-h-72 rounded-lg border border-stone-200 object-contain shadow-sm dark:border-stone-700"
              onError={handleQuestionImageError}
            />
            <div
              className="hidden max-h-72 w-full max-w-md items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50 p-6 text-center text-sm text-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400"
              style={{ display: "none" }}
            >
              Image indisponible
            </div>
          </div>
        )}

        {folderSubmitted && critiqueViolated && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            Note ramenée à 0 : une réponse indispensable n&apos;a pas été
            cochée, ou une réponse inacceptable a été cochée.
          </div>
        )}

        {question.type === "QROC" ? (
          <div className="space-y-3">
            <div
              className={`rounded-lg border p-4 ${
                isQrocAnswerCorrect(userQrocAnswer, question.reponses)
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200"
                  : "border-red-500 bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200"
              }`}
            >
              <div className="mb-1 text-sm font-semibold">Réponse donnée :</div>
              <div>{userQrocAnswer.trim() || "Aucune réponse"}</div>
            </div>

            <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-900">
              <div className="mb-1 text-sm font-semibold text-stone-700 dark:text-stone-200">
                Réponses acceptées :
              </div>
              <div className="font-medium text-emerald-700 dark:text-emerald-300">
                {question.reponses.join(", ")}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {question.choix.map((choice) => {
              const letter = getChoiceLetter(choice);
              const isCorrect = question.reponses.includes(letter);
              const isSelected = userAnswerArray.includes(letter);
              const isCritique = (question.critiques ?? []).includes(letter);

              let classes =
                "bg-stone-50 border-stone-200 text-stone-700 dark:bg-stone-900 dark:border-stone-700 dark:text-stone-200";

              if (isSelected && isCorrect) {
                classes =
                  "bg-emerald-50 border-emerald-500 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200";
              } else if (isSelected && !isCorrect) {
                classes =
                  "bg-red-50 border-red-500 text-red-800 dark:bg-red-900/20 dark:text-red-200";
              } else if (!isSelected && isCorrect) {
                classes =
                  "bg-stone-50 border-emerald-500 text-stone-700 dark:bg-stone-900 dark:text-stone-200";
              }

              return (
                <div
                  key={choice}
                  className={`rounded-lg border-2 p-3 text-sm ${classes}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span>{choice}</span>
                    <span className="flex items-center gap-2 text-xs font-semibold">
                      {isCritique && (
                        <span
                          className={`rounded-full px-2 py-0.5 ${
                            isCorrect
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200"
                          }`}
                        >
                          {isCorrect ? "Indispensable" : "Inacceptable"}
                        </span>
                      )}
                      {isSelected && isCorrect && "Coché + bon"}
                      {isSelected && !isCorrect && "Coché + faux"}
                      {!isSelected && isCorrect && "Bonne réponse oubliée"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {question.correctionExplanation && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
            <div className="mb-1 font-black text-emerald-900 dark:text-emerald-100">
              Commentaire de correction
            </div>
            <div className="whitespace-pre-wrap text-sm text-emerald-800 dark:text-emerald-200">
              {question.correctionExplanation}
            </div>
          </div>
        )}
      </div>
    );
  };

  const questionsDrawer = (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-lg font-black">Questions</div>
        <button onClick={() => setQuestionsPanelOpen(false)} aria-label="Fermer">
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
                <Lock className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-white dark:bg-stone-950" />
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
        <button onClick={() => setFoldersPanelOpen(false)} aria-label="Fermer">
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
                  : "border-stone-200 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-900"
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
      <div className="min-h-screen bg-stone-50 py-8 text-stone-950 dark:bg-black dark:text-stone-100">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mb-6">
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-2 font-semibold text-emerald-800 hover:underline dark:text-emerald-300"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour accueil
            </button>
          </div>

          <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-950 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <div className="mb-2 text-sm font-bold text-emerald-800 dark:text-emerald-300">
                  Correction globale
                </div>

                <h1 className="mb-2 text-3xl font-black sm:text-4xl">
                  {examData.matiere} - {examData.annee}
                </h1>

                <p className="text-stone-600 dark:text-stone-300">
                  Seuls les dossiers soumis sont pris en compte dans la note
                  finale.
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-800 px-8 py-6 text-center text-white shadow-sm">
                <div className="text-5xl font-black">
                  {examScore.finalScoreOn20.toFixed(2)}
                </div>
                <div className="text-sm font-semibold opacity-90">/20</div>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {examScore.categories.map((category) => (
                <div
                  key={category.type}
                  className="rounded-lg border border-stone-200 bg-stone-50 p-5 dark:border-stone-800 dark:bg-stone-900"
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

            {!allFoldersSubmitted && (
              <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
                Certains dossiers n&apos;ont pas été soumis et comptent donc 0
                pour leur pondération.
              </div>
            )}
          </div>

          <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-950">
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
                      : "border-stone-200 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-900"
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
                    className="rounded-2xl border border-stone-200 bg-stone-100 p-5 dark:border-stone-800 dark:bg-stone-900/60"
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

                      <div className="rounded-lg border border-stone-200 bg-white px-5 py-3 shadow-sm dark:border-stone-800 dark:bg-stone-950">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-950 dark:bg-black dark:text-stone-100">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur dark:border-stone-800 dark:bg-black/95">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
          <Link
            href="/"
            aria-label="Retour à l'accueil"
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-bold text-stone-600 transition-colors hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-900"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Accueil</span>
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-black">
                {examData.matiere} — {examData.annee}
              </p>
              <p className="shrink-0 text-xs font-semibold text-stone-500 dark:text-stone-400">
                {totalAnsweredQuestions}/{examData.total_questions}
              </p>
            </div>

            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-900">
              <div
                className="h-full rounded-full bg-emerald-700 transition-all dark:bg-emerald-500"
                style={{ width: `${globalProgressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={() => setQuestionsPanelOpen(true)}
              className={ICON_BUTTON_CLASSES}
              aria-label="Ouvrir les questions"
              title="Questions"
            >
              <Menu className="h-4 w-4" />
            </button>

            <button
              onClick={() => setFoldersPanelOpen(true)}
              className={ICON_BUTTON_CLASSES}
              aria-label="Ouvrir les dossiers"
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

      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-950">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 px-5 py-3 dark:border-stone-900">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-stone-100 px-2 py-1 text-xs font-black uppercase tracking-wide text-stone-600 dark:bg-stone-900 dark:text-stone-300">
                <FileText className="h-3.5 w-3.5" />
                {currentFolder.type}
              </span>
              <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                {currentFolder.title} · Question {currentQuestionIndex + 1}/
                {totalQuestionsInFolder}
              </span>
              <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-bold text-stone-600 dark:bg-stone-900 dark:text-stone-300">
                {currentQuestion.type}
                {currentQuestion.type === "QRP" &&
                  currentQuestion.maxReponses && (
                    <> · {currentQuestion.maxReponses} rép. attendues</>
                  )}
              </span>
            </div>

            <div className="flex items-center gap-2">
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
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {currentFolder.description && (
              <div className="mb-5 whitespace-pre-wrap rounded-lg border-l-4 border-stone-300 bg-stone-50 p-3 text-sm text-stone-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200">
                {currentFolder.description}
              </div>
            )}

            {currentQuestion.contexte && (
              <QuestionContextBlock
                key={currentQuestion.id}
                text={currentQuestion.contexte}
              />
            )}

            <h2 className="mb-5 whitespace-pre-wrap text-lg font-black leading-snug tracking-tight sm:text-xl">
              {currentQuestion.question}
            </h2>

            {currentQuestion.image && (
              <div className="mb-6 flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentQuestion.image}
                  alt={`Illustration Q${currentQuestion.id}`}
                  className="max-h-72 rounded-lg border border-stone-200 object-contain shadow-sm dark:border-stone-700"
                  onError={handleQuestionImageError}
                />
                <div
                  className="hidden max-h-72 w-full max-w-md items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50 p-6 text-center text-sm text-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400"
                  style={{ display: "none" }}
                >
                  Image indisponible
                </div>
              </div>
            )}

            {renderQuestionContent()}

            {isProgressiveFolder &&
              !isCurrentFolderSubmitted &&
              !isCurrentQuestionLocked && (
                <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300">
                  En {currentFolder.type}, une fois la question validée, elle
                  sera verrouillée et vous ne pourrez plus modifier votre
                  réponse.
                </div>
              )}
          </div>
        </div>

        {(isProgressiveFolder || !isCurrentFolderSubmitted) && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-stone-200 bg-white p-3.5 shadow-sm dark:border-stone-800 dark:bg-stone-950">
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
            className="inline-flex items-center gap-2 rounded-lg bg-stone-200 px-5 py-2.5 font-semibold text-stone-700 transition-colors hover:bg-stone-300 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
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

      {questionsPanelOpen && (
        <div className="fixed inset-0 z-50">
          <button
            className="absolute inset-0 bg-black/50"
            onClick={() => setQuestionsPanelOpen(false)}
            aria-label="Fermer le panneau questions"
          />

          <div className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] overflow-y-auto bg-white p-5 shadow-2xl dark:bg-stone-950">
            {questionsDrawer}
          </div>
        </div>
      )}

      {foldersPanelOpen && (
        <div className="fixed inset-0 z-50">
          <button
            className="absolute inset-0 bg-black/50"
            onClick={() => setFoldersPanelOpen(false)}
            aria-label="Fermer le panneau dossiers"
          />

          <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] overflow-y-auto bg-white p-5 shadow-2xl dark:bg-stone-950">
            {foldersDrawer}
          </div>
        </div>
      )}
    </div>
  );
}
