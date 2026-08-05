export type QuestionType =
  | "QRU"
  | "QRM"
  | "QRP"
  | "QROC"
  | "IMAGE_ZONE"
  | "ASSOCIATION"
  | "VALEUR_NUMERIQUE";

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
  /** Nom de la structure attendue (ex: "Cochlée"), affiché en légende. */
  label?: string;
}

/** Un item de question ASSOCIATION : un intitulé à faire correspondre à l'une des options de `choix`. */
export interface AssociationItem {
  id: string;
  label: string;
  /** Doit correspondre exactement à l'une des valeurs de `question.choix`. */
  correctAnswer: string;
}

export interface NumericRange {
  min: number;
  max: number;
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
  /** @deprecated conservé pour compatibilité, utiliser `images`. */
  image?: string;
  /** Une ou plusieurs images illustrant la question. */
  images?: string[];
  /** Zones correctes pour une question de type IMAGE_ZONE. */
  zones?: ImageZone[];
  /** Items à associer pour une question de type ASSOCIATION. */
  items?: AssociationItem[];
  /** Intervalle correct pour une question de type VALEUR_NUMERIQUE. */
  numericRange?: NumericRange;
  maxReponses?: number;
  correctionExplanation?: string;
  /** Image jointe au commentaire de correction (ex: formule rendue graphiquement). */
  correctionImage?: string;
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

/** Reponse a une question ASSOCIATION : id d'item -> reponse choisie. */
export type AssociationAnswer = Record<string, string>;

export type UserAnswer = string[] | string | ImagePoint[] | AssociationAnswer;

export function getQuestionImages(question: Pick<Question, "image" | "images">): string[] {
  if (question.images && question.images.length > 0) return question.images;
  return question.image ? [question.image] : [];
}

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