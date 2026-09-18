"use client";

import { useCallback } from "react";
import { useParams } from "next/navigation";
import type { ExamData } from "@/types/exam";
import { normalizeExamData } from "@/lib/exam/normalizeExam";
import ExamRunner, { type LoadedExam } from "@/components/ExamRunner";

export default function QCMPage() {
  const params = useParams();
  const slug = params.matiere as string;
  const annee = params.annee as string;
  const attemptStorageKey = `exam_attempt_${slug}_${annee}`;

  const loadExam = useCallback(async (): Promise<LoadedExam> => {
    const response = await fetch(`/data/qcm/${slug}_${annee}.json`);

    if (!response.ok) {
      throw new Error("Impossible de charger le fichier QCM");
    }

    return { exam: normalizeExamData((await response.json()) as ExamData) };
  }, [slug, annee]);

  return (
    <ExamRunner
      key={attemptStorageKey}
      mode="exam"
      slug={slug}
      attemptStorageKey={attemptStorageKey}
      backHref="/"
      loadExam={loadExam}
    />
  );
}
