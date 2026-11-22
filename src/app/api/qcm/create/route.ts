import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  getAdminActor,
  requireAdminRequest,
  safeJoinInside,
  sanitizeSlug,
  sanitizeYear,
} from "@/lib/server/security";
import { logAdminAction } from "@/lib/server/adminLog";
import { normalizeIndex, type IndexEntry } from "@/lib/server/qcmIndex";

interface NewQCM {
  matiere: string;
  slug: string;
  annee: number;
  title: string;
  total_questions: number;
  folders: {
    id: string;
    type: "SQI";
    title: string;
    description: string;
    order: number;
    questions: unknown[];
  }[];
  questions: unknown[];
}

interface ExistingQCM {
  total_questions?: number;
  folders?: {
    questions?: unknown[];
  }[];
  questions?: unknown[];
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Erreur serveur";
}

function countQuestions(qcmData: ExistingQCM): number {
  if (Array.isArray(qcmData.folders)) {
    return qcmData.folders.reduce((acc, folder) => {
      return acc + (Array.isArray(folder.questions) ? folder.questions.length : 0);
    }, 0);
  }

  return Array.isArray(qcmData.questions) ? qcmData.questions.length : 0;
}

export async function POST(req: Request) {
  try {
    const unauthorized = requireAdminRequest(req);
    if (unauthorized) return unauthorized;

    const body = await req.json();

    const { slug, matiere, annee, subjectIcon, subjectColor } = body as {
      slug: string;
      matiere: string;
      annee: number;
      subjectIcon?: string;
      subjectColor?: string;
    };

    if (!slug || !matiere || !annee) {
      return NextResponse.json(
        {
          success: false,
          message: "matiere, slug et année sont requis",
        },
        { status: 400 }
      );
    }
    const safeSlug = sanitizeSlug(slug);
    const safeYear = sanitizeYear(annee);
    const anneeNum = Number(safeYear);

    const publicDir = path.join(process.cwd(), "public");
    const qcmDir = safeJoinInside(publicDir, "data", "qcm");

    if (!fs.existsSync(qcmDir)) {
      fs.mkdirSync(qcmDir, { recursive: true });
    }

    const fileName = `${safeSlug}_${safeYear}.json`;
    const qcmPath = safeJoinInside(qcmDir, fileName);

    let totalQuestions = 0;

    if (!fs.existsSync(qcmPath)) {
      const newQCM: NewQCM = {
        matiere,
        slug: safeSlug,
        annee: anneeNum,
        title: `${matiere} - ${safeYear}`,
        total_questions: 0,
        folders: [
          {
            id: "default-questions",
            type: "SQI",
            title: "Questions",
            description: "",
            order: 1,
            questions: [],
          },
        ],
        questions: [],
      };

      fs.writeFileSync(qcmPath, JSON.stringify(newQCM, null, 2), "utf-8");
    } else {
      const raw = fs.readFileSync(qcmPath, "utf-8");
      const parsed = JSON.parse(raw) as ExistingQCM;
      totalQuestions = countQuestions(parsed);
    }

    const indexPath = path.join(qcmDir, "index.json");
    let indexData: IndexEntry[] = [];

    if (fs.existsSync(indexPath)) {
      const rawIndex = fs.readFileSync(indexPath, "utf-8");
      indexData = JSON.parse(rawIndex) as IndexEntry[];
    }

    const existingIndex = indexData.find(
      (entry) => entry.slug === safeSlug && entry.annee === anneeNum
    );
    const existingSubject = indexData.find((entry) => entry.slug === safeSlug);
    const subjectName = existingSubject?.matiere || matiere;

    if (existingIndex) {
      existingIndex.matiere = subjectName;
      existingIndex.total_questions = totalQuestions;
      existingIndex.examTitle =
        existingIndex.examTitle?.trim() || `${matiere} - ${safeYear}`;
    } else {
      indexData.push({
        matiere: subjectName,
        slug: safeSlug,
        annee: anneeNum,
        total_questions: totalQuestions,
        semesterName: existingSubject?.semesterName?.trim() || "Semestre 7",
        semesterOrder: existingSubject?.semesterOrder ?? 1,
        examTitle: `${matiere} - ${safeYear}`,
        subjectIcon: subjectIcon || existingSubject?.subjectIcon,
        subjectColor: subjectColor || existingSubject?.subjectColor,
      });
    }

    const normalizedIndex = normalizeIndex(indexData);

    fs.writeFileSync(
      indexPath,
      JSON.stringify(normalizedIndex, null, 2),
      "utf-8"
    );

    logAdminAction(
      getAdminActor(req),
      "Création/mise à jour d'un QCM",
      `${matiere} - ${safeYear}`
    );

    return NextResponse.json({
      success: true,
      message: "QCM créé avec succès",
    });
  } catch (error: unknown) {
    console.error("Erreur création QCM:", error);

    return NextResponse.json(
      {
        success: false,
        message: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
