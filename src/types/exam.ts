export type QuestionType = "QRU" | "QRM" | "QRP" | "QROC";

export type FolderType = "DP" | "SQI" | "KFP";

export type FolderStatus = "not_started" | "in_progress" | "submitted";

export interface Question {
  id: number;
  type: QuestionType;
  contexte?: string;
  question: string;
  choix: string[];
  reponses: string[];
  image?: string;
  maxReponses?: number;
  correctionExplanation?: string;
  order?: number;
}

export interface ExamFolder {
  id: string;
  type: FolderType;
  title: string;
  description?: string;
  order: number;
  questions: Question[];
}

export interface LegacyQCMData {
  matiere: string;
  annee: number;
  total_questions: number;
  questions: Question[];
}

export interface ExamData {
  matiere: string;
  slug?: string;
  annee: number;
  title?: string;
  total_questions: number;
  folders: ExamFolder[];

  /**
   * Ancien format gardé temporairement pour compatibilité.
   * Les anciennes annales ont encore directement questions[].
   */
  questions?: Question[];
}

export type UserAnswer = string[] | string;

export type UserAnswers = {
  [questionId: number]: UserAnswer;
};

export type FolderSubmissions = {
  [folderId: string]: boolean;
};

export type LockedQuestions = {
  [questionId: number]: boolean;
};

export interface QuestionScoreResult {
  questionId: number;
  score: number;
  maxScore: number;
  isCorrect: boolean;
}

export interface FolderScoreResult {
  folderId: string;
  folderTitle: string;
  folderType: FolderType;
  submitted: boolean;
  scoreOn20: number;
  rawScore: number;
  maxRawScore: number;
  questions: QuestionScoreResult[];
}

export interface CategoryScoreResult {
  type: FolderType;
  label: string;
  weight: number;
  submittedFoldersCount: number;
  averageOn20: number;
  weightedScore: number;
}

export interface ExamScoreResult {
  finalScoreOn20: number;
  folders: FolderScoreResult[];
  categories: CategoryScoreResult[];
}