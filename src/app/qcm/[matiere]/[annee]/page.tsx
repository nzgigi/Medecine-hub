"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderOpen,
  Lock,
  Menu,
  RotateCcw,
  Save,
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
import { getExamScore, getQuestionScore } from "@/lib/exam/scoring";
import { isQrocAnswerCorrect } from "@/lib/exam/qroc";

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
    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
  }

  if (status === "En cours") {
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
  }

  return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
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
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4" />
          <div className="text-xl text-gray-600 dark:text-gray-300">
            Chargement de l&apos;épreuve...
          </div>
        </div>
      </div>
    );
  }

  if (!examData || !currentFolder || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 px-4">
        <div className="max-w-xl text-center bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-800">
          <h1 className="text-2xl font-bold mb-3">Épreuve introuvable</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Impossible de charger cette épreuve.
          </p>

          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-blue-700"
          >
            <ArrowLeft className="w-4 h-4" />
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

  const totalFolders = examData.folders.length;
  const totalQuestionsInFolder = currentFolder.questions.length;

  const allFoldersSubmitted = examData.folders.every(
    (folder) => folderSubmissions[folder.id]
  );

  const submittedFoldersCount = examData.folders.filter(
    (folder) => folderSubmissions[folder.id]
  ).length;

  const totalAnsweredQuestions = examData.folders.reduce((acc, folder) => {
    return acc + getAnsweredQuestionsCount(folder, userAnswers);
  }, 0);

  const globalProgressPercent = getProgressPercent(
    totalAnsweredQuestions,
    examData.total_questions
  );

  const currentAnsweredCount = getAnsweredQuestionsCount(
    currentFolder,
    userAnswers
  );
  const currentFolderProgressPercent = getProgressPercent(
    currentAnsweredCount,
    totalQuestionsInFolder
  );

  const rawCurrentAnswer = userAnswers[currentQuestion.id];
  const currentQuestionAnswered = hasAnswer(currentQuestion, rawCurrentAnswer);
  const currentFolderUnansweredQuestions = getUnansweredQuestions(
    currentFolder,
    userAnswers
  );

  const handleFolderChange = (folderIndex: number) => {
    setCurrentFolderIndex(folderIndex);
    setCurrentQuestionIndex(0);
    setLeftPanelOpen(false);
    setRightPanelOpen(false);
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
    setRightPanelOpen(false);
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
            className="w-full border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-3 rounded-lg focus:border-blue-500 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            placeholder="Tapez votre réponse courte ici"
          />

          {(isCurrentFolderSubmitted || isCurrentQuestionLocked) && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Lock className="w-4 h-4" />
              Réponse verrouillée
            </div>
          )}
        </div>
      );
    }

    const selectedAnswers = Array.isArray(rawAnswer) ? rawAnswer : [];

    return (
      <div className="space-y-3">
        {currentQuestion.choix.map((choice) => {
          const letter = getChoiceLetter(choice);
          const isSelected = selectedAnswers.includes(letter);

          return (
            <button
              key={choice}
              onClick={() => handleAnswerSelect(letter)}
              disabled={isCurrentFolderSubmitted || isCurrentQuestionLocked}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all disabled:cursor-not-allowed ${
                isSelected
                  ? "border-blue-600 bg-blue-50 dark:bg-blue-900/40 shadow-md"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-800"
              } ${
                isCurrentFolderSubmitted || isCurrentQuestionLocked
                  ? "opacity-70"
                  : ""
              }`}
            >
              <span className="font-medium">{choice}</span>
            </button>
          );
        })}

        {(isCurrentFolderSubmitted || isCurrentQuestionLocked) && (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Lock className="w-4 h-4" />
            Réponse verrouillée
          </div>
        )}
      </div>
    );
  };

  const renderCorrectionQuestion = (
    question: Question,
    folderSubmitted: boolean
  ) => {
    const answer = userAnswers[question.id];
    const score = getQuestionScore(question, answer);

    const userAnswerArray = Array.isArray(answer) ? answer : [];
    const userQrocAnswer = typeof answer === "string" ? answer : "";

    return (
      <div
        key={question.id}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-md p-6 border border-gray-100 dark:border-gray-800"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">
              Question {question.id} • {question.type}
            </div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
              {question.question}
            </h3>
          </div>

          <div
            className={`text-sm font-bold px-3 py-1 rounded-full ${
              score === 1
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                : score > 0
                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
            }`}
          >
            {folderSubmitted ? `${score.toFixed(2)} / 1` : "Non soumis"}
          </div>
        </div>

        {question.contexte && (
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl mb-4 text-sm text-gray-700 dark:text-gray-200 border-l-4 border-blue-400 whitespace-pre-wrap">
            {question.contexte}
          </div>
        )}

        {question.image && (
          <div className="mb-4 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={question.image}
              alt={`Illustration Q${question.id}`}
              className="max-h-72 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm object-contain"
            />
          </div>
        )}

        {question.type === "QROC" ? (
          <div className="space-y-3">
            <div
              className={`rounded-xl border p-4 ${
                isQrocAnswerCorrect(userQrocAnswer, question.reponses)
                  ? "bg-green-50 border-green-500 text-green-800 dark:bg-green-900/20 dark:text-green-200"
                  : "bg-red-50 border-red-500 text-red-800 dark:bg-red-900/20 dark:text-red-200"
              }`}
            >
              <div className="text-sm font-semibold mb-1">Réponse donnée :</div>
              <div>{userQrocAnswer.trim() || "Aucune réponse"}</div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
                Réponses acceptées :
              </div>
              <div className="text-green-700 dark:text-green-300 font-medium">
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

              let classes =
                "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200";

              if (isSelected && isCorrect) {
                classes =
                  "bg-green-50 dark:bg-green-900/20 border-green-500 text-green-800 dark:text-green-200";
              } else if (isSelected && !isCorrect) {
                classes =
                  "bg-red-50 dark:bg-red-900/20 border-red-500 text-red-800 dark:text-red-200";
              } else if (!isSelected && isCorrect) {
                classes =
                  "bg-gray-50 dark:bg-gray-800 border-green-500 text-gray-700 dark:text-gray-200";
              }

              return (
                <div
                  key={choice}
                  className={`rounded-xl border-2 p-3 text-sm ${classes}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span>{choice}</span>
                    <span className="text-xs font-semibold">
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
          <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
            <div className="font-bold text-blue-900 dark:text-blue-100 mb-1">
              Commentaire de correction
            </div>
            <div className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
              {question.correctionExplanation}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (showResults && examScore) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-6">
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour accueil
            </button>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl p-8 border border-gray-100 dark:border-gray-800 mb-8">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div>
                <div className="text-sm text-blue-600 dark:text-blue-400 font-semibold mb-2">
                  Correction globale
                </div>

                <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">
                  {examData.matiere} - {examData.annee}
                </h1>

                <p className="text-gray-600 dark:text-gray-300">
                  Seuls les dossiers soumis sont pris en compte dans la note
                  finale.
                </p>
              </div>

              <div className="text-center bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-3xl px-8 py-6 shadow-xl">
                <div className="text-5xl font-extrabold">
                  {examScore.finalScoreOn20.toFixed(2)}
                </div>
                <div className="text-sm font-semibold opacity-90">/20</div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mt-8">
              {examScore.categories.map((category) => (
                <div
                  key={category.type}
                  className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700"
                >
                  <div className="font-bold mb-1">{category.label}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    Pondération : {Math.round(category.weight * 100)}%
                  </div>

                  <div className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">
                    {category.averageOn20.toFixed(2)}/20
                  </div>

                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {category.submittedFoldersCount} dossier(s) soumis
                  </div>
                </div>
              ))}
            </div>

            {!allFoldersSubmitted && (
              <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-2xl p-4 text-yellow-800 dark:text-yellow-200">
                Certains dossiers n&apos;ont pas été soumis et comptent donc 0
                pour leur pondération.
              </div>
            )}
          </div>

          <div className="mb-6 bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 p-4">
            <div className="font-bold mb-4 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-blue-600" />
              Dossiers
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {examData.folders.map((folder, index) => (
                <button
                  key={folder.id}
                  onClick={() => setCorrectionFolderIndex(index)}
                  className={`text-left rounded-xl p-3 border transition ${
                    index === correctionFolderIndex
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">
                    {folder.type} - {getFolderTypeLabel(folder.type)}
                  </div>
                  <div className="font-semibold text-sm line-clamp-2">
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
                  className="bg-gray-100 dark:bg-gray-900/60 rounded-3xl p-5 border border-gray-200 dark:border-gray-800"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
                    <div>
                      <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">
                        {folder.type} • {getFolderTypeLabel(folder.type)}
                      </div>

                      <h2 className="text-2xl font-extrabold">
                        {folder.title}
                      </h2>

                      <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        Statut :{" "}
                        <span className="font-semibold">
                          {folderSubmitted ? "soumis" : "non soumis"}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-900 rounded-2xl px-5 py-3 border border-gray-100 dark:border-gray-800 shadow-sm">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Note dossier
                      </div>
                      <div className="text-2xl font-extrabold">
                        {folderSubmitted && folderScore
                          ? `${folderScore.scoreOn20.toFixed(2)}/20`
                          : "Non soumis"}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {folder.questions.map((question) =>
                      renderCorrectionQuestion(question, folderSubmitted)
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-gray-950/90 backdrop-blur border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Accueil
          </Link>

          <div className="hidden md:block text-center min-w-[280px]">
            <div className="font-bold">
              {examData.matiere} - {examData.annee}
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400">
              {submittedFoldersCount}/{totalFolders} dossier(s) soumis •{" "}
              {totalAnsweredQuestions}/{examData.total_questions} question(s)
              répondues
            </div>

            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all"
                style={{ width: `${globalProgressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className="hidden lg:inline-flex items-center gap-2 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-xl border border-green-100 dark:border-green-800">
              <Save className="w-3 h-3" />
              Sauvegarde auto
            </span>

            <button
              onClick={resetAttempt}
              className="hidden sm:inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <RotateCcw className="w-4 h-4" />
              Réinitialiser
            </button>

            <button
              onClick={submitExam}
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-semibold shadow-sm"
            >
              <Send className="w-4 h-4" />
              Soumettre l&apos;épreuve
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={() => setLeftPanelOpen(true)}
        className="fixed left-3 top-24 z-40 md:hidden bg-blue-600 text-white p-3 rounded-xl shadow-lg"
        aria-label="Ouvrir les dossiers"
      >
        <FolderOpen className="w-5 h-5" />
      </button>

      <button
        onClick={() => setRightPanelOpen(true)}
        className="fixed right-3 top-24 z-40 md:hidden bg-purple-600 text-white p-3 rounded-xl shadow-lg"
        aria-label="Ouvrir les questions"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-[260px_1fr_220px] gap-6">
        <aside className="hidden md:block">
          <div className="sticky top-24 bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 p-4">
            <div className="font-bold mb-4 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-blue-600" />
              Dossiers
            </div>

            <div className="space-y-2">
              {examData.folders.map((folder, index) => {
                const status = getFolderStatus(
                  folder,
                  userAnswers,
                  folderSubmissions
                );
                const answeredCount = getAnsweredQuestionsCount(
                  folder,
                  userAnswers
                );
                const folderProgressPercent = getProgressPercent(
                  answeredCount,
                  folder.questions.length
                );

                return (
                  <button
                    key={folder.id}
                    onClick={() => handleFolderChange(index)}
                    className={`w-full text-left rounded-xl p-3 border transition ${
                      index === currentFolderIndex
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                        {folder.type}
                      </div>

                      <div
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getFolderStatusClasses(
                          status
                        )}`}
                      >
                        {status}
                      </div>
                    </div>

                    <div className="font-semibold text-sm line-clamp-2">
                      {folder.title}
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {answeredCount}/{folder.questions.length} question(s)
                    </div>

                    <div className="mt-2 w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${folderProgressPercent}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <main>
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-bold mb-4">
                    <FileText className="w-4 h-4" />
                    {currentFolder.type} •{" "}
                    {getFolderTypeLabel(currentFolder.type)}
                  </div>

                  <h1 className="text-lg sm:text-xl font-bold mb-1">
                    {currentFolder.title}
                  </h1>

                  <p className="text-gray-600 dark:text-gray-300">
                    Question {currentQuestionIndex + 1}/{totalQuestionsInFolder}
                  </p>

                </div>

                {isCurrentFolderSubmitted && (
                  <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-4 py-2 rounded-xl font-semibold">
                    <CheckCircle className="w-5 h-5" />
                    Dossier soumis
                  </div>
                )}
              </div>

              <div className="hidden">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    Progression du dossier : {currentAnsweredCount}/
                    {totalQuestionsInFolder} réponse(s)
                  </span>
                  <span>{currentFolderProgressPercent}%</span>
                </div>

                <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all"
                    style={{ width: `${currentFolderProgressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              {currentFolder.description && (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl mb-6 text-sm text-gray-700 dark:text-gray-200 border-l-4 border-blue-400 whitespace-pre-wrap">
                  {currentFolder.description}
                </div>
              )}

              {false &&
                !isCurrentFolderSubmitted &&
                currentFolderUnansweredQuestions.length > 0 && (
                  <div className="mb-6 flex items-start gap-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 rounded-xl p-4 text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">Dossier incomplet</div>
                      <div>
                        Il reste {currentFolderUnansweredQuestions.length}{" "}
                        question(s) sans réponse dans ce dossier.
                      </div>
                    </div>
                  </div>
                )}

              <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
                <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-full text-sm font-semibold">
                  {currentQuestion.type}
                  {currentQuestion.type === "QRP" &&
                    currentQuestion.maxReponses && (
                      <> — {currentQuestion.maxReponses} réponses attendues</>
                    )}
                </span>

                {currentQuestionAnswered ? (
                  <span className="text-sm text-green-600 dark:text-green-400 font-semibold">
                    Réponse enregistrée
                  </span>
                ) : (
                  <span className="text-sm text-gray-500 dark:text-gray-400 font-semibold">
                    En attente de réponse
                  </span>
                )}
              </div>

              {currentQuestion.contexte && (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl mb-6 text-sm text-gray-700 dark:text-gray-200 border-l-4 border-blue-400 whitespace-pre-wrap">
                  {currentQuestion.contexte}
                </div>
              )}

              {currentQuestion.image && (
                <div className="mb-6 flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentQuestion.image}
                    alt={`Illustration Q${currentQuestion.id}`}
                    className="max-h-72 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm object-contain"
                  />
                </div>
              )}

              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 whitespace-pre-wrap">
                {currentQuestion.question}
              </h2>

              {renderQuestionContent()}

              {isProgressiveFolder &&
                !isCurrentFolderSubmitted &&
                !isCurrentQuestionLocked && (
                  <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200 rounded-xl p-4 text-sm">
                    En {currentFolder.type}, une fois la question validée, elle
                    sera verrouillée et vous ne pourrez plus modifier votre
                    réponse.
                  </div>
                )}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
            <button
              onClick={handlePrevious}
              disabled={currentFolderIndex === 0 && currentQuestionIndex === 0}
              className="inline-flex items-center gap-2 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-5 py-3 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              <ChevronLeft className="w-4 h-4" />
              Précédent
            </button>

            <div className="flex items-center gap-3 flex-wrap justify-center">
              {isProgressiveFolder &&
                !isCurrentFolderSubmitted &&
                !isCurrentQuestionLocked && (
                  <button
                    onClick={validateProgressiveQuestion}
                    disabled={!currentQuestionAnswered}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      currentQuestionAnswered
                        ? "Valider et verrouiller cette question"
                        : "Répondez d'abord à la question"
                    }
                  >
                    <Lock className="w-4 h-4" />
                    Valider la question
                  </button>
                )}

              {!isCurrentFolderSubmitted && (
                <button
                  onClick={submitFolder}
                  className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl font-semibold shadow-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  Soumettre le dossier
                </button>
              )}
            </div>

            <button
              onClick={handleNext}
              disabled={!canGoNext}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              Suivant
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </main>

        <aside className="hidden md:block">
          <div className="sticky top-24 bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 p-4">
            <div className="font-bold mb-4 flex items-center gap-2">
              <Menu className="w-5 h-5 text-purple-600" />
              Questions
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
                    className={`h-10 rounded-lg text-sm font-bold border transition relative ${
                      active
                        ? "bg-blue-600 text-white border-blue-600"
                        : answered
                        ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700"
                        : "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {index + 1}
                    {locked && (
                      <Lock className="w-3 h-3 absolute -top-1 -right-1 bg-white dark:bg-gray-900 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {leftPanelOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            className="absolute inset-0 bg-black/50"
            onClick={() => setLeftPanelOpen(false)}
            aria-label="Fermer le panneau dossiers"
          />

          <div className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white dark:bg-gray-900 p-5 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div className="font-bold text-lg">Dossiers</div>
              <button onClick={() => setLeftPanelOpen(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-2">
              {examData.folders.map((folder, index) => {
                const status = getFolderStatus(
                  folder,
                  userAnswers,
                  folderSubmissions
                );
                const answeredCount = getAnsweredQuestionsCount(
                  folder,
                  userAnswers
                );
                const folderProgressPercent = getProgressPercent(
                  answeredCount,
                  folder.questions.length
                );

                return (
                  <button
                    key={folder.id}
                    onClick={() => handleFolderChange(index)}
                    className={`w-full text-left rounded-xl p-3 border transition ${
                      index === currentFolderIndex
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                        {folder.type}
                      </div>

                      <div
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getFolderStatusClasses(
                          status
                        )}`}
                      >
                        {status}
                      </div>
                    </div>

                    <div className="font-semibold text-sm">{folder.title}</div>

                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {answeredCount}/{folder.questions.length} question(s)
                    </div>

                    <div className="mt-2 w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${folderProgressPercent}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {rightPanelOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            className="absolute inset-0 bg-black/50"
            onClick={() => setRightPanelOpen(false)}
            aria-label="Fermer le panneau questions"
          />

          <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white dark:bg-gray-900 p-5 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div className="font-bold text-lg">Questions</div>
              <button onClick={() => setRightPanelOpen(false)}>
                <X className="w-6 h-6" />
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
                    className={`h-10 rounded-lg text-sm font-bold border transition relative ${
                      active
                        ? "bg-blue-600 text-white border-blue-600"
                        : answered
                        ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700"
                        : "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {index + 1}
                    {locked && (
                      <Lock className="w-3 h-3 absolute -top-1 -right-1 bg-white dark:bg-gray-900 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
