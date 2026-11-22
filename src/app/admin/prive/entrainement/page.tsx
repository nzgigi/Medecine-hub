"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Dumbbell, Play } from "lucide-react";
import type { ExamData } from "@/types/exam";
import PrivateFiltersForm from "@/components/PrivateFiltersForm";
import TrainingRunner from "@/components/TrainingRunner";
import { AdminSessionExpiredError, hasAdminToken, loadPrivateExams } from "@/lib/exam/privateClient";
import {
  applyFilters,
  buildPool,
  buildTrainingBlocks,
  filterOptions,
  filtersFromParams,
  PRIVATE_HISTORY_UPDATED_EVENT,
  readPrivateHistory,
  type PrivateFilters,
  type PrivateHistory,
  type TrainingBlock,
  type TrainingOrder,
} from "@/lib/exam/privateTraining";

const SCREEN_CLASS =
  "flex min-h-screen items-center justify-center bg-stone-50 px-4 text-stone-950 dark:bg-[#151512] dark:text-stone-100";

type Phase = { name: "setup" } | { name: "run"; blocks: TrainingBlock[]; runId: number };

function TrainingPage() {
  const router = useRouter();
  const params = useSearchParams();

  const [exams, setExams] = useState<ExamData[] | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<PrivateHistory>({});
  const [filters, setFilters] = useState<PrivateFilters>(() => filtersFromParams(params));
  const [annee, setAnnee] = useState<number | null>(() => {
    const value = Number(params.get("annee"));
    return Number.isInteger(value) && value > 0 ? value : null;
  });
  const [order, setOrder] = useState<TrainingOrder>("aleatoire");
  const [phase, setPhase] = useState<Phase>({ name: "setup" });

  const autostart = params.get("auto") === "1";

  useEffect(() => {
    if (!hasAdminToken()) {
      router.push("/admin/login");
      return;
    }

    let cancelled = false;
    loadPrivateExams()
      .then((loaded) => {
        if (!cancelled) setExams(loaded);
      })
      .catch((e: unknown) => {
        if (e instanceof AdminSessionExpiredError) router.push("/admin/login");
        else if (!cancelled) setError("Impossible de charger les QCM privés.");
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    // localStorage n'existe pas côté serveur : l'historique ne se lit qu'après le premier rendu.
    const sync = () => setHistory(readPrivateHistory());
    sync();
    window.addEventListener(PRIVATE_HISTORY_UPDATED_EVENT, sync);
    return () => window.removeEventListener(PRIVATE_HISTORY_UPDATED_EVENT, sync);
  }, []);

  const pool = useMemo(() => buildPool(exams ?? []), [exams]);
  const options = useMemo(() => filterOptions(pool), [pool]);
  const scopedPool = useMemo(
    () => (annee === null ? pool : pool.filter((entry) => entry.annee === annee)),
    [pool, annee]
  );
  const matching = useMemo(
    () => applyFilters(scopedPool, filters, history),
    [scopedPool, filters, history]
  );
  const blockCount = useMemo(() => buildTrainingBlocks(matching, "fichier").length, [matching]);

  const start = useCallback(
    (questions: typeof matching) => {
      setPhase((previous) => ({
        name: "run",
        blocks: buildTrainingBlocks(questions, order),
        runId: previous.name === "run" ? previous.runId + 1 : 1,
      }));
    },
    [order]
  );

  // « Refaire mes erreurs » arrive avec auto=1 : on lance sans repasser par le réglage.
  const [autoDone, setAutoDone] = useState(false);
  useEffect(() => {
    const runAuto = () => {
      setAutoDone(true);
      if (matching.length > 0) start(matching);
    };

    if (autostart && !autoDone && exams !== null) runAuto();
  }, [autostart, autoDone, exams, matching, start]);

  const restartWithKeys = (keys: string[]) => {
    const wanted = new Set(keys);
    const subset = pool.filter((entry) => wanted.has(entry.key));
    if (subset.length > 0) start(subset);
  };

  if (error) {
    return (
      <div className={SCREEN_CLASS}>
        <p className="font-bold text-red-600">{error}</p>
      </div>
    );
  }

  if (exams === null || (autostart && !autoDone)) {
    return (
      <div className={SCREEN_CLASS}>
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-stone-300 border-b-emerald-800 dark:border-stone-800 dark:border-b-emerald-300" />
      </div>
    );
  }

  if (phase.name === "run") {
    return (
      <main className="min-h-screen bg-stone-50 text-stone-950 dark:bg-[#151512] dark:text-stone-100">
        <TrainingRunner
          key={phase.runId}
          blocks={phase.blocks}
          onRestartWithKeys={restartWithKeys}
          onBackToSetup={() => setPhase({ name: "setup" })}
          quitHref="/admin"
        />
      </main>
    );
  }

  const hasPool = pool.length > 0;
  const minutesHint = Math.max(1, Math.round(matching.length * 1.2));

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-10 text-stone-950 dark:bg-[#151512] dark:text-stone-100">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-stone-950 dark:text-stone-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Admin
        </Link>

        <div className="mb-6 mt-6 flex items-center gap-3">
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Dumbbell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black">S&apos;entraîner</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Une question à la fois, correction immédiate.
            </p>
          </div>
        </div>

        {!hasPool ? (
          <div className="rounded-lg border border-dashed border-stone-300 p-10 text-center dark:border-stone-700">
            <p className="font-bold">Aucun QCM privé pour le moment.</p>
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
              Importe un fichier depuis la page administrateur.
            </p>
          </div>
        ) : (
          <section className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#1d1c18] sm:p-6">
            {annee !== null && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full bg-emerald-50 px-3 py-1 font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                  Annale {annee} uniquement
                </span>
                <button
                  type="button"
                  onClick={() => setAnnee(null)}
                  className="font-semibold text-stone-500 underline hover:text-stone-900 dark:text-stone-400"
                >
                  Toutes les années
                </button>
              </div>
            )}

            <PrivateFiltersForm filters={filters} options={options} onChange={setFilters} />

            <fieldset>
              <legend className="mb-1 text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                Ordre
              </legend>
              <div className="flex flex-wrap gap-4 text-sm font-semibold">
                {(
                  [
                    ["aleatoire", "Aléatoire"],
                    ["fichier", "Ordre du fichier"],
                  ] as const
                ).map(([value, label]) => (
                  <label key={value} className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="order"
                      checked={order === value}
                      onChange={() => setOrder(value)}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                Un DP ou un KFP reste toujours en bloc, dans l&apos;ordre de ses questions.
              </p>
            </fieldset>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-stone-100 pt-4 dark:border-stone-800">
              <p data-testid="matching-count">
                <span className="text-3xl font-black">{matching.length}</span>{" "}
                <span className="text-sm text-stone-500 dark:text-stone-400">
                  question{matching.length > 1 ? "s" : ""} correspondante{matching.length > 1 ? "s" : ""}
                  {matching.length > 0 && ` · ${blockCount} bloc${blockCount > 1 ? "s" : ""} · ~${minutesHint} min`}
                </span>
              </p>

              <button
                onClick={() => start(matching)}
                disabled={matching.length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-5 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                Commencer
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default function TrainingEntryPage() {
  return (
    <Suspense fallback={<div className={SCREEN_CLASS} />}>
      <TrainingPage />
    </Suspense>
  );
}
