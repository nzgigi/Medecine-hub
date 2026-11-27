import fs from "fs";
import { safeJoinInside, sanitizeSlug, sanitizeYear } from "@/lib/server/security";
import { compareNames, renameExam } from "@/lib/exam/privateNaming";

// Hors de public/ : jamais servi par le serveur statique, uniquement via les routes admin.
export function privateQcmDir() {
  const dir = safeJoinInside(process.cwd(), "data", "private-qcm");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export interface PrivateQcmSummary {
  slug: string;
  annee: number;
  matiere: string;
  total_questions: number;
  folders: number;
}

export function privateQcmPath(slug: string, annee: string | number) {
  return safeJoinInside(privateQcmDir(), `${sanitizeSlug(slug)}_${sanitizeYear(annee)}.json`);
}

export function listPrivateQcm(): PrivateQcmSummary[] {
  const dir = privateQcmDir();
  const summaries: PrivateQcmSummary[] = [];

  for (const name of fs.readdirSync(dir)) {
    if (!/^[a-z0-9-]+_\d{4}\.json$/.test(name)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(safeJoinInside(dir, name), "utf-8")) as {
        slug: string;
        annee: number;
        matiere: string;
        total_questions: number;
        folders?: unknown[];
      };
      summaries.push({
        slug: data.slug,
        annee: data.annee,
        matiere: data.matiere,
        total_questions: data.total_questions,
        folders: data.folders?.length ?? 0,
      });
    } catch {
      // fichier illisible : ignore
    }
  }

  return summaries.sort((a, b) => compareNames(a.matiere, b.matiere) || b.annee - a.annee);
}

/** Renomme toutes les années d'une matière privée. Renvoie le nombre d'épreuves modifiées. */
export function renamePrivateSubject(slug: string, matiere: string): number {
  let renamed = 0;

  for (const entry of listPrivateQcm().filter((item) => item.slug === slug)) {
    const target = privateQcmPath(entry.slug, entry.annee);
    const exam = JSON.parse(fs.readFileSync(target, "utf-8")) as {
      matiere: string;
      annee: number;
      title?: string;
    };
    const temp = `${target}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(renameExam(exam, matiere), null, 2), "utf-8");
    fs.renameSync(temp, target);
    renamed += 1;
  }

  return renamed;
}
