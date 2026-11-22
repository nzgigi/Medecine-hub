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
import { normalizeIndex, type IndexEntry } from "@/lib/server/qcmIndex";
import { validateAnnales } from "@/lib/annalesImport";

interface ImportBody {
  annales?: unknown;
  overwrite?: boolean;
}

export async function POST(request: Request) {
  try {
    const unauthorized = requireAdminRequest(request);
    if (unauthorized) return unauthorized;

    const body = (await request.json()) as ImportBody;
    if (!Array.isArray(body.annales)) {
      return NextResponse.json(
        { success: false, message: "Liste d'annales manquante." },
        { status: 400 }
      );
    }

    const qcmDir = safeJoinInside(process.cwd(), "public", "data", "qcm");
    fs.mkdirSync(qcmDir, { recursive: true });

    const indexPath = safeJoinInside(qcmDir, "index.json");
    const indexData: IndexEntry[] = fs.existsSync(indexPath)
      ? (JSON.parse(fs.readFileSync(indexPath, "utf-8")) as IndexEntry[])
      : [];

    // Revalidation serveur : on ne fait jamais confiance au apercu envoye par le client.
    const subjects = [...new Map(indexData.map((entry) => [entry.slug, entry])).values()].map(
      (entry) => ({ slug: entry.slug, matiere: entry.matiere })
    );
    const { valid, errors } = validateAnnales(body.annales, subjects, indexData);

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, message: errors.map((e) => e.message).join(" ") },
        { status: 400 }
      );
    }

    const overwrite = body.overwrite === true;
    let imported = 0;
    let skipped = 0;

    for (const item of valid) {
      const slug = sanitizeSlug(item.slug);
      const year = sanitizeYear(item.annee);
      const filePath = safeJoinInside(qcmDir, `${slug}_${year}.json`);

      if (fs.existsSync(filePath) && !overwrite) {
        skipped += 1;
        continue;
      }

      fs.writeFileSync(filePath, JSON.stringify(item.exam, null, 2), "utf-8");

      const existingEntry = indexData.find(
        (entry) => entry.slug === slug && entry.annee === item.annee
      );
      const subjectEntry = indexData.find((entry) => entry.slug === slug);

      if (existingEntry) {
        existingEntry.total_questions = item.totalQuestions;
        if (item.examTitle) existingEntry.examTitle = item.examTitle;
        if (item.semesterName) existingEntry.semesterName = item.semesterName;
      } else {
        indexData.push({
          matiere: subjectEntry?.matiere ?? item.matiere,
          slug,
          annee: item.annee,
          total_questions: item.totalQuestions,
          semesterName: item.semesterName || subjectEntry?.semesterName?.trim() || "Semestre 7",
          semesterOrder: subjectEntry?.semesterOrder ?? 1,
          examTitle: item.examTitle || `${item.matiere} - ${item.annee}`,
          subjectIcon: subjectEntry?.subjectIcon,
          subjectColor: subjectEntry?.subjectColor,
        });
      }

      imported += 1;
    }

    if (imported > 0) {
      fs.writeFileSync(indexPath, JSON.stringify(normalizeIndex(indexData), null, 2), "utf-8");
      logAdminAction(
        getAdminActor(request),
        "Import d'annales (JSON)",
        valid.map((item) => `${item.slug} ${item.annee}`).join(", ")
      );
    }

    return NextResponse.json({ success: true, imported, skipped });
  } catch (error: unknown) {
    console.error("Erreur import annales:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
