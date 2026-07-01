import { NextResponse } from "next/server";
import fs from "fs";
import { requireAdminRequest, safeJoinInside } from "@/lib/server/security";

interface Question {
  id: number;
  type: string;
  contexte?: string;
  question: string;
  choix: string[];
  reponses: string[];
  image?: string;
  maxReponses?: number;
  correctionExplanation?: string;
  order?: number;
}

interface LegacyQcmData {
  matiere: string;
  annee: number;
  total_questions?: number;
  questions?: Question[];
  folders?: unknown[];
  [key: string]: unknown;
}

interface MigratedFile {
  file: string;
  totalQuestions: number;
}

const qcmDir = safeJoinInside(process.cwd(), "public", "data", "qcm");

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Erreur inconnue";
}

function isQcmJsonFile(fileName: string): boolean {
  return fileName.endsWith(".json") && fileName !== "index.json";
}

function migrateQcmData(data: LegacyQcmData): LegacyQcmData {
  const questions = Array.isArray(data.questions) ? data.questions : [];

  const normalizedQuestions = questions.map((question, index) => ({
    ...question,
    order: question.order ?? index + 1,
  }));

  return {
    ...data,
    total_questions: normalizedQuestions.length,
    folders: [
      {
        id: "default-questions",
        type: "SQI",
        title: "Questions",
        description: "",
        order: 1,
        questions: normalizedQuestions,
      },
    ],
    questions: normalizedQuestions,
  };
}

export async function POST(request: Request) {
  try {
    const unauthorized = requireAdminRequest(request);
    if (unauthorized) return unauthorized;

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

    const migratedFiles: MigratedFile[] = [];
    const skippedFiles: string[] = [];

    for (const file of files) {
      const filePath = safeJoinInside(qcmDir, file);
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw) as LegacyQcmData;

      if (Array.isArray(data.folders) && data.folders.length > 0) {
        skippedFiles.push(file);
        continue;
      }

      if (!Array.isArray(data.questions)) {
        skippedFiles.push(file);
        continue;
      }

      const migratedData = migrateQcmData(data);

      fs.writeFileSync(
        filePath,
        JSON.stringify(migratedData, null, 2),
        "utf-8"
      );

      migratedFiles.push({
        file,
        totalQuestions: data.questions.length,
      });
    }

    return NextResponse.json({
      success: true,
      message: `${migratedFiles.length} fichier(s) migré(s), ${skippedFiles.length} ignoré(s)`,
      migratedFiles,
      skippedFiles,
    });
  } catch (error: unknown) {
    console.error("Erreur migration QCM:", error);

    return NextResponse.json(
      {
        success: false,
        message: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
