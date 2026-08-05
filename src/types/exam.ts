export type QuestionType = "QRU" | "QRM" | "QRP" | "QROC" | "IMAGE_ZONE";

export type FolderType = "DP" | "SQI" | "KFP";

export type FolderStatus = "not_started" | "in_progress" | "submitted";

/**
 * Coordonnees exprimees en fraction de la LARGEUR de l'image (pas un
 * pourcentage classique relatif a chaque axe), pour que x, y et radius
 * partagent la meme echelle et que les distances restent correctes quelle
 * que soit la proportion largeur/hauteur de l'image.
 */
export interface ImagePoint {
  x: number;
  y: number;
}

export interface ImageZone extends ImagePoint {
  radius: number;
}

export interface Question {
  id: number;
  type: QuestionType;
  contexte?: string;
  question: string;
  choix: string[];
  reponses: string[];
  /**
   * Lettres de choix marquées "critique" : indispensable si la lettre est
   * dans `reponses`, inacceptable sinon. Voir src/lib/exam/scoring.ts.
   */
  critiques?: string[];
  image?: string;
  /** Zones correctes pour une question de type IMAGE_ZONE. */
  zones?: ImageZone[];
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

export type UserAnswer = string[] | string | ImagePoint[];

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