import type {
  ExamData,
  ExamScoreResult,
  FolderScoreResult,
  FolderSubmissions,
  FolderType,
  Question,
  QuestionScoreResult,
  UserAnswer,
  UserAnswers,
} from "@/types/exam";
import { isQrocAnswerCorrect } from "./qroc";

const CATEGORY_WEIGHTS: Record<FolderType, number> = {
  DP: 0.4,
  SQI: 0.4,
  KFP: 0.2,
};

const CATEGORY_LABELS: Record<FolderType, string> = {
  DP: "Dossiers progressifs",
  SQI: "Séquences de questions isolées",
  KFP: "Key Features Problems",
};

function arraysAreEqual(a: string[], b: string[]): boolean {
  return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
}

/**
 * Une réponse "critique" annule toute la question si l'étudiant ne respecte
 * pas sa contrainte : indispensable (bonne réponse critique) non cochée, ou
 * inacceptable (mauvaise réponse critique) cochée.
 */
export function violatesCritique(
  question: Question,
  userAnswers: string[]
): boolean {
  const critiques = question.critiques ?? [];
  if (critiques.length === 0) return false;

  const correctSet = new Set(question.reponses);
  const selectedSet = new Set(userAnswers);

  return critiques.some((letter) => {
    const isCorrectChoice = correctSet.has(letter);
    const isSelected = selectedSet.has(letter);
    return isCorrectChoice ? !isSelected : isSelected;
  });
}

export function getQuestionScore(
  question: Question,
  answer: UserAnswer | undefined
): number {
  if (question.type === "QROC") {
    const userText = typeof answer === "string" ? answer : "";
    return isQrocAnswerCorrect(userText, question.reponses) ? 1 : 0;
  }

  const userAnswers = Array.isArray(answer) ? answer : [];
  const correctAnswers = [...question.reponses];

  if (violatesCritique(question, userAnswers)) {
    return 0;
  }

  if (question.type === "QRU") {
    return arraysAreEqual(userAnswers, correctAnswers) ? 1 : 0;
  }

  if (question.type === "QRP") {
    if (correctAnswers.length === 0) return 0;

    const pointsPerGoodAnswer = 1 / correctAnswers.length;

    const goodSelected = userAnswers.filter((answerLetter) =>
      correctAnswers.includes(answerLetter)
    ).length;

    return goodSelected * pointsPerGoodAnswer;
  }

  if (userAnswers.length === 0) return 0;

  const correctSet = new Set(correctAnswers);
  const selectedSet = new Set(userAnswers);

  let mistakes = 0;

  for (const correct of correctSet) {
    if (!selectedSet.has(correct)) {
      mistakes++;
    }
  }

  for (const selected of selectedSet) {
    if (!correctSet.has(selected)) {
      mistakes++;
    }
  }

  if (mistakes === 0) return 1;
  if (mistakes === 1) return 0.5;
  if (mistakes === 2) return 0.2;

  return 0;
}

export function getQuestionScoreResult(
  question: Question,
  answer: UserAnswer | undefined
): QuestionScoreResult {
  const score = getQuestionScore(question, answer);

  return {
    questionId: question.id,
    score,
    maxScore: 1,
    isCorrect: score === 1,
  };
}

export function getFolderScore(
  folderId: string,
  exam: ExamData,
  userAnswers: UserAnswers,
  folderSubmissions: FolderSubmissions
): FolderScoreResult | null {
  const folder = exam.folders.find((item) => item.id === folderId);

  if (!folder) return null;

  const submitted = Boolean(folderSubmissions[folder.id]);

  const questionScores = folder.questions.map((question) =>
    getQuestionScoreResult(question, userAnswers[question.id])
  );

  const rawScore = questionScores.reduce((acc, item) => acc + item.score, 0);
  const maxRawScore = folder.questions.length;

  const scoreOn20 =
    maxRawScore > 0 ? Number(((rawScore / maxRawScore) * 20).toFixed(2)) : 0;

  return {
    folderId: folder.id,
    folderTitle: folder.title,
    folderType: folder.type,
    submitted,
    scoreOn20,
    rawScore,
    maxRawScore,
    questions: questionScores,
  };
}

export function getExamScore(
  exam: ExamData,
  userAnswers: UserAnswers,
  folderSubmissions: FolderSubmissions
): ExamScoreResult {
  const folderScores = exam.folders
    .map((folder) => getFolderScore(folder.id, exam, userAnswers, folderSubmissions))
    .filter(Boolean) as FolderScoreResult[];

  const presentTypes = (["DP", "SQI", "KFP"] as FolderType[]).filter((type) =>
    exam.folders.some((folder) => folder.type === type)
  );
  const totalPresentWeight = presentTypes.reduce(
    (acc, type) => acc + CATEGORY_WEIGHTS[type],
    0
  );

  const categories = presentTypes.map((type) => {
    const foldersOfType = folderScores.filter((folder) => folder.folderType === type);
    const submittedFolders = foldersOfType.filter((folder) => folder.submitted);
    const normalizedWeight =
      totalPresentWeight > 0 ? CATEGORY_WEIGHTS[type] / totalPresentWeight : 0;

    // Les dossiers non soumis comptent pour 0 : on divise par le nombre total
    // de dossiers de la catégorie, pas seulement par ceux qui sont soumis.
    const averageOn20 =
      foldersOfType.length > 0
        ? submittedFolders.reduce((acc, folder) => acc + folder.scoreOn20, 0) /
          foldersOfType.length
        : 0;

    const roundedAverageOn20 = Number(averageOn20.toFixed(2));
    const weightedScore = Number((roundedAverageOn20 * normalizedWeight).toFixed(2));

    return {
      type,
      label: CATEGORY_LABELS[type],
      weight: normalizedWeight,
      submittedFoldersCount: submittedFolders.length,
      averageOn20: roundedAverageOn20,
      weightedScore,
    };
  });

  const finalScoreOn20 = Number(
    categories.reduce((acc, category) => acc + category.weightedScore, 0).toFixed(2)
  );

  return {
    finalScoreOn20,
    folders: folderScores,
    categories,
  };
}
