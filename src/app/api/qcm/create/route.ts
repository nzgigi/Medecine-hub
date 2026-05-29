import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface IndexEntry {
  matiere: string;
  slug: string;
  annee: number;
  total_questions: number;
  subjectOrder?: number;
  examOrder?: number;
  examTitle?: string;
}

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

function normalizeIndex(entries: IndexEntry[]): IndexEntry[] {
  const subjectSlugs: string[] = [];

  entries.forEach((entry) => {
    if (!subjectSlugs.includes(entry.slug)) {
      subjectSlugs.push(entry.slug);
    }
  });

  const subjectOrderMap = new Map<string, number>();

  subjectSlugs
    .map((slug) => {
      const subjectEntries = entries.filter((entry) => entry.slug === slug);
      const existingOrder = subjectEntries.find(
        (entry) => typeof entry.subjectOrder === "number"
      )?.subjectOrder;

      return {
        slug,
        order: existingOrder ?? subjectSlugs.indexOf(slug) + 1,
      };
    })
    .sort((a, b) => a.order - b.order)
    .forEach((item, index) => {
      subjectOrderMap.set(item.slug, index + 1);
    });

  const grouped = new Map<string, IndexEntry[]>();

  entries.forEach((entry) => {
    if (!grouped.has(entry.slug)) {
      grouped.set(entry.slug, []);
    }

    grouped.get(entry.slug)?.push(entry);
  });

  const normalized: IndexEntry[] = [];

  grouped.forEach((subjectEntries, slug) => {
    const sortedExams = [...subjectEntries].sort((a, b) => {
      const orderA = a.examOrder ?? a.annee;
      const orderB = b.examOrder ?? b.annee;
      return orderA - orderB;
    });

    sortedExams.forEach((entry, index) => {
      normalized.push({
        ...entry,
        subjectOrder: subjectOrderMap.get(slug) ?? 999,
        examOrder: index + 1,
        examTitle:
          entry.examTitle?.trim() || `${entry.matiere} - ${entry.annee}`,
      });
    });
  });

  return normalized.sort((a, b) => {
    const subjectDiff = (a.subjectOrder ?? 999) - (b.subjectOrder ?? 999);
    if (subjectDiff !== 0) return subjectDiff;

    return (a.examOrder ?? 999) - (b.examOrder ?? 999);
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { slug, matiere, annee } = body as {
      slug: string;
      matiere: string;
      annee: number;
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

    const publicDir = path.join(process.cwd(), "public");
    const qcmDir = path.join(publicDir, "data", "qcm");

    if (!fs.existsSync(qcmDir)) {
      fs.mkdirSync(qcmDir, { recursive: true });
    }

    const fileName = `${slug}_${annee}.json`;
    const qcmPath = path.join(qcmDir, fileName);

    let totalQuestions = 0;

    if (!fs.existsSync(qcmPath)) {
      const newQCM: NewQCM = {
        matiere,
        slug,
        annee,
        title: `${matiere} - ${annee}`,
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
      (entry) => entry.slug === slug && entry.annee === annee
    );

    if (existingIndex) {
      existingIndex.matiere = matiere;
      existingIndex.total_questions = totalQuestions;
      existingIndex.examTitle =
        existingIndex.examTitle?.trim() || `${matiere} - ${annee}`;
    } else {
      indexData.push({
        matiere,
        slug,
        annee,
        total_questions: totalQuestions,
        examTitle: `${matiere} - ${annee}`,
      });
    }

    const normalizedIndex = normalizeIndex(indexData);

    fs.writeFileSync(
      indexPath,
      JSON.stringify(normalizedIndex, null, 2),
      "utf-8"
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