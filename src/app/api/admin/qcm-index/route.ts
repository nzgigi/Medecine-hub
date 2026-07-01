import { NextResponse } from "next/server";
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
  subjectOrder?: number;
  examOrder?: number;
  examTitle?: string;
  semesterName?: string;
  semesterOrder?: number;
}

type SaveIndexBody = {
  action: "saveIndex";
  entries: IndexEntry[];
};

type DeleteExamBody = {
  action: "deleteExam";
  slug: string;
  annee: number;
};

type DeleteSubjectBody = {
  action: "deleteSubject";
  slug: string;
};

type NormalizeIndexBody = {
  action: "normalizeIndex";
};

type RequestBody =
  | SaveIndexBody
  | DeleteExamBody
  | DeleteSubjectBody
  | NormalizeIndexBody;

const qcmDir = safeJoinInside(process.cwd(), "public", "data", "qcm");
const indexPath = safeJoinInside(qcmDir, "index.json");

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Erreur inconnue";
}

function readIndex(): IndexEntry[] {
  if (!fs.existsSync(indexPath)) return [];

  return JSON.parse(fs.readFileSync(indexPath, "utf-8")) as IndexEntry[];
}

function writeIndex(entries: IndexEntry[]) {
  if (!fs.existsSync(qcmDir)) {
    fs.mkdirSync(qcmDir, { recursive: true });
  }

  fs.writeFileSync(indexPath, JSON.stringify(entries, null, 2), "utf-8");
}

function normalizeEntries(entries: IndexEntry[]): IndexEntry[] {
  entries.forEach((entry) => {
    entry.slug = sanitizeSlug(entry.slug);
    entry.annee = Number(sanitizeYear(entry.annee));
  });

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
        semesterName: entry.semesterName?.trim() || "Semestre 7",
        semesterOrder: entry.semesterOrder ?? 1,
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

function deleteFileIfExists(filePath: string) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export async function POST(request: Request) {
  try {
    const unauthorized = requireAdminRequest(request);
    if (unauthorized) return unauthorized;

    const body = (await request.json()) as RequestBody;

    if (body.action === "saveIndex") {
      const normalizedEntries = normalizeEntries(body.entries);
      writeIndex(normalizedEntries);

      return NextResponse.json({
        success: true,
        message: "Index sauvegardé avec succès",
        entries: normalizedEntries,
      });
    }

    if (body.action === "normalizeIndex") {
      const currentIndex = readIndex();
      const normalizedEntries = normalizeEntries(currentIndex);

      writeIndex(normalizedEntries);

      return NextResponse.json({
        success: true,
        message: "Index normalisé avec succès",
        entries: normalizedEntries,
      });
    }

    if (body.action === "deleteExam") {
      const safeSlug = sanitizeSlug(body.slug);
      const safeYear = sanitizeYear(body.annee);
      const safeYearNumber = Number(safeYear);
      const currentIndex = readIndex();

      const entryToDelete = currentIndex.find(
        (entry) => entry.slug === safeSlug && entry.annee === safeYearNumber
      );

      if (!entryToDelete) {
        return NextResponse.json(
          {
            success: false,
            message: "Épreuve introuvable dans l'index",
          },
          { status: 404 }
        );
      }

      const qcmFilePath = safeJoinInside(qcmDir, `${safeSlug}_${safeYear}.json`);
      deleteFileIfExists(qcmFilePath);

      const nextIndex = currentIndex.filter(
        (entry) => !(entry.slug === safeSlug && entry.annee === safeYearNumber)
      );

      writeIndex(normalizeEntries(nextIndex));

      return NextResponse.json({
        success: true,
        message: "Épreuve supprimée avec succès",
      });
    }

    if (body.action === "deleteSubject") {
      const safeSlug = sanitizeSlug(body.slug);
      const currentIndex = readIndex();
      const subjectEntries = currentIndex.filter(
        (entry) => entry.slug === safeSlug
      );

      if (subjectEntries.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Matière introuvable dans l'index",
          },
          { status: 404 }
        );
      }

      subjectEntries.forEach((entry) => {
        const qcmFilePath = safeJoinInside(
          qcmDir,
          `${entry.slug}_${entry.annee}.json`
        );

        deleteFileIfExists(qcmFilePath);
      });

      const nextIndex = currentIndex.filter((entry) => entry.slug !== safeSlug);

      writeIndex(normalizeEntries(nextIndex));

      return NextResponse.json({
        success: true,
        message: "Matière supprimée avec succès",
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: "Action inconnue",
      },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error("Erreur qcm-index:", error);

    return NextResponse.json(
      {
        success: false,
        message: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
