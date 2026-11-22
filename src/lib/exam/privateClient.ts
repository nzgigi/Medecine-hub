import type { ExamData } from "@/types/exam";
import { normalizeExamData } from "@/lib/exam/normalizeExam";

/** Jeton admin du navigateur : les QCM privés ne se chargent que par l'API admin. */
export function hasAdminToken(): boolean {
  try {
    return Boolean(localStorage.getItem("admin_token"));
  } catch {
    return false;
  }
}

export class AdminSessionExpiredError extends Error {
  constructor() {
    super("Session admin expirée");
  }
}

const ENDPOINT = "/api/admin/private-qcm";

async function adminFetch(url: string): Promise<Response> {
  const token = localStorage.getItem("admin_token") || "";
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

  if (response.status === 401) {
    localStorage.removeItem("admin_token");
    throw new AdminSessionExpiredError();
  }
  return response;
}

/** Tous les QCM privés, normalisés (slug garanti). */
export async function loadPrivateExams(): Promise<ExamData[]> {
  const listResponse = await adminFetch(ENDPOINT);
  if (!listResponse.ok) throw new Error("Impossible de lister les QCM privés");

  const { qcms } = (await listResponse.json()) as {
    qcms?: { slug: string; annee: number }[];
  };

  const exams = await Promise.all(
    (qcms ?? []).map(async ({ slug, annee }): Promise<ExamData | null> => {
      const response = await adminFetch(
        `${ENDPOINT}?slug=${encodeURIComponent(slug)}&annee=${encodeURIComponent(annee)}`
      );
      if (!response.ok) return null;

      const exam = normalizeExamData((await response.json()) as ExamData);
      return { ...exam, slug: exam.slug ?? slug, annee: exam.annee ?? annee };
    })
  );

  return exams.filter((exam): exam is ExamData => exam !== null);
}
