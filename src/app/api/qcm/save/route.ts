import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import {
  requireAdminRequest,
  safeJoinInside,
  sanitizeSlug,
  sanitizeYear,
} from "@/lib/server/security";

interface IndexEntry {
  matiere: string;
  slug: string;
  annee: number;
  total_questions: number;
}

interface QcmData {
  total_questions: number;
  folders?: {
    questions?: unknown[];
  }[];
  questions?: unknown[];
  [key: string]: unknown;
}

interface SaveBody {
  matiere?: string;
  annee?: string | number;
  qcmData?: QcmData;
}

function countQuestions(qcmData: QcmData): number {
  if (Array.isArray(qcmData.folders)) {
    return qcmData.folders.reduce((acc, folder) => {
      return acc + (Array.isArray(folder.questions) ? folder.questions.length : 0);
    }, 0);
  }

  return Array.isArray(qcmData.questions) ? qcmData.questions.length : 0;
}

export async function POST(request: NextRequest) {
  try {
    const unauthorized = requireAdminRequest(request);
    if (unauthorized) return unauthorized;

    const body = (await request.json()) as SaveBody;
    const { matiere, annee, qcmData } = body;

    if (!matiere || !annee || !qcmData) {
      return NextResponse.json(
        {
          success: false,
          message: "Données manquantes (matiere, annee ou qcmData)",
        },
        { status: 400 }
      );
    }

    const safeSlug = sanitizeSlug(matiere);
    const anneeString = sanitizeYear(annee);
    const dirPath = safeJoinInside(process.cwd(), "public", "data", "qcm");
    const filePath = safeJoinInside(dirPath, `${safeSlug}_${anneeString}.json`);

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const qcmDataToSave: QcmData = {
      ...qcmData,
      total_questions: countQuestions(qcmData),
    };

    fs.writeFileSync(filePath, JSON.stringify(qcmDataToSave, null, 2), "utf-8");

    try {
      const indexPath = safeJoinInside(dirPath, "index.json");

      if (fs.existsSync(indexPath)) {
        const indexData = JSON.parse(
          fs.readFileSync(indexPath, "utf-8")
        ) as IndexEntry[];

        const indexEntry = indexData.find(
          (item) =>
            item.slug === safeSlug && item.annee === parseInt(anneeString, 10)
        );

        if (indexEntry) {
          indexEntry.total_questions = qcmDataToSave.total_questions;

          fs.writeFileSync(
            indexPath,
            JSON.stringify(indexData, null, 2),
            "utf-8"
          );
        }
      }
    } catch (indexError: unknown) {
      console.error("Erreur mise à jour index:", indexError);
    }

    return NextResponse.json({
      success: true,
      message: "QCM sauvegardé avec succès",
    });
  } catch (error: unknown) {
    console.error("Erreur sauvegarde:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Erreur lors de la sauvegarde",
      },
      { status: 500 }
    );
  }
}
