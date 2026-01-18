export interface Question {
  id: number;
  type: string;
  contexte?: string;
  question: string;
  choix: string[];
  reponses: string[];
}

export interface QCMData {
  matiere: string;
  annee: number;
  total_questions: number;
  questions: Question[];
}

export interface MatiereInfo {
  matiere: string;
  slug: string;
  annee: number;
  total_questions: number;
  filename: string;
}
