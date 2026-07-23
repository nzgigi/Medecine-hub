import { NextResponse } from "next/server";
import fs from "fs";
import {
  getAdminActor,
  requireAdminRequest,
  safeJoinInside,
  sanitizeSlug,
  sanitizeYear,
} from "@/lib/server/security";
import { logAdminAction } from "@/lib/server/adminLog";

interface IndexEntry {
  matiere: string;
  slug: string;
  annee: number;
  total_questions: number;
}

interface QcmFileData {
  questions?: unknown[];
  folders?: {
    questions?: unknown[];
  }[];
}

interface SyncUpdate {
  matiere: string;
  annee: number;
  old: number;
  new: number;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Erreur inconnue";
}

function countQuestions(qcmData: QcmFileData): number {
  if (Array.isArray(qcmData.folders)) {
    return qcmData.folders.reduce((acc, folder) => {
      return acc + (Array.isArray(folder.questions) ? folder.questions.length : 0);
    }, 0);
  }

  return Array.isArray(qcmData.questions) ? qcmData.questions.length : 0;
}

export async function POST(request: Request) {
  try {
    const unauthorized = requireAdminRequest(request);
    if (unauthorized) return unauthorized;

    const qcmDir = safeJoinInside(process.cwd(), "public", "data", "qcm");
    const indexPath = safeJoinInside(qcmDir, "index.json");

    const indexData = JSON.parse(
      fs.readFileSync(indexPath, "utf-8")
    ) as IndexEntry[];

    let updated = 0;
    const updates: SyncUpdate[] = [];

    for (const entry of indexData) {
      const filename = `${sanitizeSlug(entry.slug)}_${sanitizeYear(entry.annee)}.json`;
      const filepath = safeJoinInside(qcmDir, filename);

      try {
        const qcmData = JSON.parse(
          fs.readFileSync(filepath, "utf-8")
        ) as QcmFileData;

        const realTotal = countQuestions(qcmData);

        if (entry.total_questions !== realTotal) {
          updates.push({
            matiere: entry.matiere,
            annee: entry.annee,
            old: entry.total_questions,
            new: realTotal,
          });

          entry.total_questions = realTotal;
          updated++;
        }
      } catch (error: unknown) {
        console.error(`Erreur avec ${filename}:`, getErrorMessage(error));
      }
    }

    if (updated > 0) {
      fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
    }

    logAdminAction(
      getAdminActor(request),
      "Synchronisation des totaux de questions",
      `${updated} entrée(s) mise(s) à jour`
    );

    return NextResponse.json({
      success: true,
      updated,
      changes: updates,
      message:
        updated > 0
          ? `${updated} entrée(s) mise(s) à jour`
          : "Tous les totaux sont déjà corrects",
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);

    console.error("Erreur sync:", error);

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 }
    );
  }
}
