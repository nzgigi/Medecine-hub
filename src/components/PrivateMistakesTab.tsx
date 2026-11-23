"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import type { ExamData } from "@/types/exam";
import PrivateFiltersForm from "@/components/PrivateFiltersForm";
import { QuestionBadges } from "@/components/QuestionView";
import {
  AdminSessionExpiredError,
  fetchPrivateHistory,
  loadPrivateExams,
} from "@/lib/exam/privateClient";
import {
  applyFilters,
  buildPool,
  EMPTY_FILTERS,
  filterOptions,
  filtersToParams,
  PRIVATE_HISTORY_UPDATED_EVENT,
  type PrivateFilters,
  type PrivateHistory,
} from "@/lib/exam/privateTraining";

function plural(count: number, singular: string) {
  return count > 1 ? `${singular}s` : singular;
}

/** Onglet « QCM privés » de « Mes erreurs » : mêmes règles que les annales (admin uniquement). */
export default function PrivateMistakesTab() {
  const router = useRouter();
  const [exams, setExams] = useState<ExamData[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [history, setHistory] = useState<PrivateHistory | null>(null);
  const [filters, setFilters] = useState<PrivateFilters>(EMPTY_FILTERS);

  useEffect(() => {
    let cancelled = false;
    loadPrivateExams()
      .then((loaded) => {
        if (!cancelled) setExams(loaded);
      })
      .catch((error: unknown) => {
        if (error instanceof AdminSessionExpiredError) router.push("/admin/login");
        else if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    // localStorage n'existe pas côté serveur : l'historique ne se lit qu'après le premier rendu.
    const sync = () => {
      fetchPrivateHistory()
        .then(setHistory)
        .catch((error: unknown) => {
          if (error instanceof AdminSessionExpiredError) router.push("/admin/login");
          else setFailed(true);
        });
    };
    sync();
    window.addEventListener(PRIVATE_HISTORY_UPDATED_EVENT, sync);
    return () => {
      window.removeEventListener(PRIVATE_HISTORY_UPDATED_EVENT, sync);
    };
  }, [router]);

  const pool = useMemo(() => buildPool(exams ?? []), [exams]);
  const options = useMemo(() => filterOptions(pool), [pool]);

  // Erreur active = dernier résultat non entièrement exact ; la réussir une fois la retire.
  const errors = useMemo(
    () => applyFilters(pool, { ...filters, statut: "erreurs" }, history ?? {}),
    [pool, filters, history]
  );
  const totalErrors = useMemo(
    () => applyFilters(pool, { ...EMPTY_FILTERS, statut: "erreurs" }, history ?? {}).length,
    [pool, history]
  );

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; items: typeof errors }>();
    for (const entry of errors) {
      const id = `${entry.slug}|${entry.annee}`;
      const group = map.get(id) ?? { label: `${entry.matiere} — ${entry.annee}`, items: [] };
      group.items.push(entry);
      map.set(id, group);
    }
    return [...map.values()];
  }, [errors]);

  if (failed) {
    return <p className="font-bold text-red-600">Impossible de charger les QCM privés.</p>;
  }
  if (exams === null || history === null) {
    return <p className="text-sm text-stone-500 dark:text-stone-400">Chargement...</p>;
  }

  const redoHref = `/admin/prive/entrainement?${new URLSearchParams({
    ...Object.fromEntries(filtersToParams({ ...filters, statut: "erreurs" })),
    auto: "1",
  }).toString()}`;

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#1d1c18]">
        <PrivateFiltersForm filters={filters} options={options} onChange={setFilters} hideStatus />
      </section>

      {totalErrors === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 p-10 text-center dark:border-stone-700">
          <p className="font-bold">Aucune erreur sur tes QCM privés.</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-stone-500 dark:text-stone-400">
            Passe un QCM privé ou lance un entraînement : les questions non entièrement exactes
            seront listées ici.
          </p>
        </div>
      ) : (
        <>
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#1d1c18]">
            <div>
              <p className="text-3xl font-black" data-testid="private-errors-count">
                {errors.length} {plural(errors.length, "question")} à revoir
              </p>
              {errors.length !== totalErrors && (
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  sur {totalErrors} au total, selon les filtres
                </p>
              )}
            </div>

            {errors.length > 0 && (
              <Link
                href={redoHref}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-5 py-3 font-bold text-white transition hover:bg-emerald-700"
              >
                <Play className="h-4 w-4" />
                Refaire mes erreurs
              </Link>
            )}
          </section>

          {groups.map((group) => (
            <section
              key={group.label}
              className="rounded-lg border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-[#1d1c18]"
            >
              <h2 className="border-b border-stone-100 px-5 py-3 text-sm font-black uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:text-stone-400">
                {group.label} · {group.items.length}
              </h2>
              <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                {group.items.map((entry) => {
                  const record = history?.[entry.key];
                  return (
                    <li key={entry.key} className="flex items-start justify-between gap-4 px-5 py-3 text-sm">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-stone-500 dark:text-stone-400">
                          {entry.folderTitle}
                          {entry.item ? ` · ${entry.item}` : ""}
                          {record ? ` · ratée ${record.wrongCount} fois` : ""}
                        </p>
                        <p className="mt-0.5">{entry.question.question.slice(0, 200)}</p>
                      </div>
                      <QuestionBadges question={entry.question} />
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
