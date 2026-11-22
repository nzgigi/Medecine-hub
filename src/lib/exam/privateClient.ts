import type { ExamData } from "@/types/exam";
import { normalizeExamData } from "@/lib/exam/normalizeExam";
import {
  LEGACY_PRIVATE_HISTORY_STORAGE_KEY,
  parsePrivateHistory,
  PRIVATE_HISTORY_UPDATED_EVENT,
  type PrivateHistory,
  type PrivateOutcome,
} from "@/lib/exam/privateTraining";

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

// --- Historique privé : stocké côté serveur, accessible au seul administrateur ---

const HISTORY_ENDPOINT = "/api/admin/private-history";

function adminHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${localStorage.getItem("admin_token") || ""}`,
    "Content-Type": "application/json",
  };
}

export async function fetchPrivateHistory(): Promise<PrivateHistory> {
  await migrateLegacyHistory();
  const response = await adminFetch(HISTORY_ENDPOINT);
  if (!response.ok) throw new Error("Impossible de charger l'historique privé");

  const { history } = (await response.json()) as { history?: unknown };
  return parsePrivateHistory(JSON.stringify(history ?? {}));
}

/** Enregistre sur le serveur ; ne casse jamais la séance en cas d'échec réseau. */
export async function recordPrivateOutcomes(outcomes: PrivateOutcome[]): Promise<void> {
  if (outcomes.length === 0) return;

  try {
    const response = await fetch(HISTORY_ENDPOINT, {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({ outcomes }),
    });
    if (response.ok) window.dispatchEvent(new Event(PRIVATE_HISTORY_UPDATED_EVENT));
  } catch {
    // Réseau indisponible : on perd ce suivi, pas la séance.
  }
}

/**
 * La v1 gardait l'historique dans le navigateur (lisible depuis le site public).
 * On le reprend une fois sur le serveur, puis on le supprime du navigateur.
 */
export async function migrateLegacyHistory(): Promise<void> {
  try {
    const raw = localStorage.getItem(LEGACY_PRIVATE_HISTORY_STORAGE_KEY);
    if (!raw) return;

    const legacy = parsePrivateHistory(raw);
    if (Object.keys(legacy).length > 0) {
      const response = await fetch(HISTORY_ENDPOINT, {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ legacyHistory: legacy }),
      });
      if (!response.ok) return; // on garde la copie locale tant que le serveur ne l'a pas
    }
    localStorage.removeItem(LEGACY_PRIVATE_HISTORY_STORAGE_KEY);
  } catch {
    // réessayé au prochain chargement
  }
}
