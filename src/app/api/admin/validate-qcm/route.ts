import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface Question {
  id: number;
  type: "QRU" | "QRM" | "QRP" | "QROC" | string;
  contexte?: string;
  question?: string;
  choix?: string[];
  reponses?: string[];
  image?: string;
  maxReponses?: number;
  correctionExplanation?: string;
  order?: number;
}

interface Folder {
  id?: string;
  type?: "DP" | "SQI" | "KFP" | string;
  title?: string;
  description?: string;
  order?: number;
  questions?: Question[];
}

interface QcmFileData {
  matiere?: string;
  slug?: string;
  annee?: number;
  total_questions?: number;
  folders?: Folder[];
  questions?: Question[];
}

interface ValidationIssue {
  file: string;
  level: "error" | "warning";
  message: string;
}

const qcmDir = path.join(process.cwd(), "public", "data", "qcm");

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Erreur inconnue";
}

function isQcmJsonFile(fileName: string): boolean {
  return fileName.endsWith(".json") && fileName !== "index.json";
}

function getFolders(data: QcmFileData): Folder[] {
  if (Array.isArray(data.folders) && data.folders.length > 0) {
    return data.folders;
  }

  if (Array.isArray(data.questions)) {
    return [
      {
        id: "legacy-questions",
        type: "SQI",
        title: "Questions",
        order: 1,
        questions: data.questions,
      },
    ];
  }

  return [];
}

function validateQuestion(
  file: string,
  folderTitle: string,
  question: Question,
  issues: ValidationIssue[]
) {
  const label = `${folderTitle} / Q${question.id ?? "?"}`;

  if (!question.question || !question.question.trim()) {
    issues.push({
      file,
      level: "error",
      message: `${label} : texte de question vide`,
    });
  }

  const allowedTypes = ["QRU", "QRM", "QRP", "QROC"];

  if (!allowedTypes.includes(question.type)) {
    issues.push({
      file,
      level: "error",
      message: `${label} : type de question invalide (${question.type})`,
    });
  }

  const answers = Array.isArray(question.reponses) ? question.reponses : [];

  if (question.type === "QROC") {
    if (answers.length === 0) {
      issues.push({
        file,
        level: "error",
        message: `${label} : QROC sans réponse acceptée`,
      });
    }

    return;
  }

  const choices = Array.isArray(question.choix) ? question.choix : [];

  if (choices.length < 2) {
    issues.push({
      file,
      level: "error",
      message: `${label} : moins de 2 choix de réponse`,
    });
  }

  if (answers.length === 0) {
    issues.push({
      file,
      level: "error",
      message: `${label} : aucune bonne réponse définie`,
    });
  }

  choices.forEach((choice, index) => {
    const expectedLetter = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[index];

    if (!choice.startsWith(`${expectedLetter})`)) {
      issues.push({
        file,
        level: "warning",
        message: `${label} : le choix ${index + 1} devrait commencer par "${expectedLetter})"`,
      });
    }
  });

  answers.forEach((answer) => {
    const exists = choices.some((choice) => choice.startsWith(`${answer})`));

    if (!exists) {
      issues.push({
        file,
        level: "error",
        message: `${label} : la réponse "${answer}" ne correspond à aucun choix`,
      });
    }
  });

  if (question.type === "QRU" && answers.length !== 1) {
    issues.push({
      file,
      level: "error",
      message: `${label} : QRU avec ${answers.length} réponses correctes au lieu de 1`,
    });
  }

  if (question.type === "QRP") {
    if (!question.maxReponses || question.maxReponses < 1) {
      issues.push({
        file,
        level: "error",
        message: `${label} : QRP sans maxReponses valide`,
      });
    }

    if (question.maxReponses && question.maxReponses > choices.length) {
      issues.push({
        file,
        level: "error",
        message: `${label} : maxReponses supérieur au nombre de choix`,
      });
    }
  }
}

function validateQcmFile(file: string, data: QcmFileData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!data.matiere || !data.matiere.trim()) {
    issues.push({
      file,
      level: "warning",
      message: "matiere manquante",
    });
  }

  if (!data.annee) {
    issues.push({
      file,
      level: "warning",
      message: "annee manquante",
    });
  }

  const folders = getFolders(data);

  if (folders.length === 0) {
    issues.push({
      file,
      level: "error",
      message: "aucun dossier ni aucune question trouvée",
    });

    return issues;
  }

  folders.forEach((folder, folderIndex) => {
    const folderTitle = folder.title?.trim() || `Dossier ${folderIndex + 1}`;

    if (!folder.title || !folder.title.trim()) {
      issues.push({
        file,
        level: "warning",
        message: `${folderTitle} : titre de dossier manquant`,
      });
    }

    const allowedFolderTypes = ["DP", "SQI", "KFP"];

    if (!folder.type || !allowedFolderTypes.includes(folder.type)) {
      issues.push({
        file,
        level: "error",
        message: `${folderTitle} : type de dossier invalide (${folder.type || "vide"})`,
      });
    }

    const questions = Array.isArray(folder.questions) ? folder.questions : [];

    if (questions.length === 0) {
      issues.push({
        file,
        level: "warning",
        message: `${folderTitle} : dossier sans question`,
      });
    }

    questions.forEach((question) => {
      validateQuestion(file, folderTitle, question, issues);
    });
  });

  return issues;
}

export async function POST() {
  try {
    if (!fs.existsSync(qcmDir)) {
      return NextResponse.json(
        {
          success: false,
          message: "Dossier public/data/qcm introuvable",
        },
        { status: 404 }
      );
    }

    const files = fs.readdirSync(qcmDir).filter(isQcmJsonFile);

    const issues: ValidationIssue[] = [];

    for (const file of files) {
      try {
        const filePath = path.join(qcmDir, file);
        const raw = fs.readFileSync(filePath, "utf-8");
        const data = JSON.parse(raw) as QcmFileData;

        issues.push(...validateQcmFile(file, data));
      } catch (error: unknown) {
        issues.push({
          file,
          level: "error",
          message: `Impossible de lire/analyser le fichier : ${getErrorMessage(error)}`,
        });
      }
    }

    const errorCount = issues.filter((issue) => issue.level === "error").length;
    const warningCount = issues.filter(
      (issue) => issue.level === "warning"
    ).length;

    return NextResponse.json({
      success: true,
      checkedFiles: files.length,
      errorCount,
      warningCount,
      issues,
      message:
        issues.length === 0
          ? `${files.length} fichier(s) vérifié(s), aucun problème détecté`
          : `${files.length} fichier(s) vérifié(s), ${errorCount} erreur(s), ${warningCount} warning(s)`,
    });
  } catch (error: unknown) {
    console.error("Erreur validation QCM:", error);

    return NextResponse.json(
      {
        success: false,
        message: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}