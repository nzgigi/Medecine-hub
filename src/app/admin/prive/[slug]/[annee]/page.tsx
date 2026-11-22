"use client";

import { useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import type { ExamData } from "@/types/exam";
import { normalizeExamData } from "@/lib/exam/normalizeExam";
import ExamRunner, { type LoadedExam } from "@/components/ExamRunner";

// QCM prive : charge via l'API admin (jamais depuis public/) et passe en mode
// "practice" : rien dans l'historique public ni le classement ; les resultats
// alimentent seulement l'historique prive ("Mes erreurs" > QCM prives).
export default function PrivateQcmPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const annee = params.annee as string;

  useEffect(() => {
    if (!localStorage.getItem("admin_token")) router.push("/admin/login");
  }, [router]);

  const loadExam = useCallback(async (): Promise<LoadedExam> => {
    const token = localStorage.getItem("admin_token") || "";
    const response = await fetch(
      `/api/admin/private-qcm?slug=${encodeURIComponent(slug)}&annee=${encodeURIComponent(annee)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (response.status === 401) {
      localStorage.removeItem("admin_token");
      router.push("/admin/login");
      throw new Error("Session admin expiree");
    }
    if (!response.ok) throw new Error("Impossible de charger le QCM prive");

    return { exam: normalizeExamData((await response.json()) as ExamData) };
  }, [slug, annee, router]);

  return (
    <ExamRunner
      key={`${slug}_${annee}`}
      mode="practice"
      privateSlug={slug}
      attemptStorageKey={`private_exam_attempt_${slug}_${annee}`}
      backHref="/admin"
      backLabel="Admin"
      loadExam={loadExam}
    />
  );
}
