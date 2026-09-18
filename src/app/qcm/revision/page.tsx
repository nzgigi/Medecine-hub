"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ExamRunner from "@/components/ExamRunner";
import {
  loadPracticeExam,
  loadSession,
  practiceAttemptKey,
  type PracticeSession,
} from "@/lib/exam/practiceSession";

type State =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "ready"; session: PracticeSession };

const SCREEN_CLASS =
  "flex min-h-screen items-center justify-center bg-stone-50 px-4 text-stone-950 dark:bg-[#151512] dark:text-stone-100";

/** Séance de révision : rejoue des questions tirées de plusieurs épreuves avec le moteur d'épreuve. */
export default function RevisionPage() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    // localStorage n'existe pas côté serveur : la séance ne peut être lue qu'après le premier rendu.
    const syncSession = () => {
      const session = loadSession();
      setState(session ? { status: "ready", session } : { status: "empty" });
    };

    syncSession();
  }, []);

  if (state.status === "loading") {
    return (
      <div className={SCREEN_CLASS}>
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-stone-300 border-b-emerald-800 dark:border-stone-800 dark:border-b-emerald-300" />
      </div>
    );
  }

  if (state.status === "empty") {
    return (
      <div className={SCREEN_CLASS}>
        <div className="max-w-md rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm dark:border-stone-800 dark:bg-[#1d1c18]">
          <h1 className="mb-3 text-2xl font-black">Aucune séance en cours</h1>
          <p className="mb-6 text-stone-600 dark:text-stone-300">
            Lance une séance personnalisée, ou révise tes erreurs.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/seance"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-5 py-3 font-bold text-white hover:bg-emerald-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Séance personnalisée
            </Link>
            <Link
              href="/erreurs"
              className="inline-flex items-center gap-2 rounded-lg border border-stone-300 px-5 py-3 font-bold text-stone-800 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              Mes erreurs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { session } = state;
  const isCustom = session.kind === "custom";

  return (
    <ExamRunner
      key={session.id}
      mode="practice"
      attemptStorageKey={practiceAttemptKey(session)}
      backHref={isCustom ? "/seance" : "/erreurs"}
      backLabel={isCustom ? "Séances" : "Mes erreurs"}
      timeLimitMinutes={session.timeLimitMinutes}
      loadExam={() => loadPracticeExam(session)}
    />
  );
}
