"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Play, RotateCcw, Shuffle, Target, Trash2 } from "lucide-react";
import { useDialogs } from "@/components/DialogProvider";
import {
  clearMistakes,
  groupByExam,
  MISTAKES_UPDATED_EVENT,
  readMistakes,
  sortByPriority,
  type MistakeEntry,
} from "@/lib/exam/mistakes";
import {
  createSessionId,
  discardSessionAttempt,
  findUnfinishedSession,
  PRACTICE_SESSION_SIZE,
  saveSession,
  shuffle,
  type PracticeSession,
} from "@/lib/exam/practiceSession";

function formatRelative(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  return `il y a ${days} j`;
}

function plural(count: number, singular: string) {
  return count > 1 ? `${singular}s` : singular;
}

export default function ErreursPage() {
  const router = useRouter();
  const { confirm } = useDialogs();

  const [entries, setEntries] = useState<MistakeEntry[] | null>(null);
  const [unfinished, setUnfinished] = useState<PracticeSession | null>(null);

  useEffect(() => {
    // localStorage n'existe pas côté serveur : la liste ne peut être lue qu'après le premier rendu.
    const syncFromStorage = () => {
      setEntries(Object.values(readMistakes()));
      setUnfinished(findUnfinishedSession());
    };

    syncFromStorage();
    window.addEventListener(MISTAKES_UPDATED_EVENT, syncFromStorage);
    window.addEventListener("storage", syncFromStorage);

    return () => {
      window.removeEventListener(MISTAKES_UPDATED_EVENT, syncFromStorage);
      window.removeEventListener("storage", syncFromStorage);
    };
  }, []);

  const startSession = async (title: string, pool: MistakeEntry[]) => {
    if (
      unfinished &&
      !(await confirm("La séance en cours sera abandonnée.", {
        title: "Lancer une nouvelle séance ?",
        confirmLabel: "Remplacer",
      }))
    ) {
      return;
    }

    if (unfinished) discardSessionAttempt(unfinished);

    const chosen = shuffle(sortByPriority(pool).slice(0, PRACTICE_SESSION_SIZE));

    saveSession({
      id: createSessionId(),
      kind: "erreurs",
      title,
      refs: chosen.map((entry) => ({
        slug: entry.slug,
        annee: entry.annee,
        questionId: entry.questionId,
        fingerprint: entry.fingerprint,
      })),
      createdAt: new Date().toISOString(),
    });

    router.push("/qcm/revision");
  };

  const handleClear = async () => {
    const confirmed = await confirm("Ta liste d'erreurs sera vidée sur cet appareil.", {
      title: "Effacer toutes tes erreurs ?",
      confirmLabel: "Effacer",
      danger: true,
    });

    if (confirmed) clearMistakes();
  };

  const groups = entries ? groupByExam(entries) : [];
  const total = entries?.length ?? 0;
  const sessionSize = Math.min(total, PRACTICE_SESSION_SIZE);

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-10 text-stone-950 dark:bg-[#151512] dark:text-stone-100">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 transition-colors hover:text-stone-950 dark:text-stone-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l&apos;accueil
        </Link>

        <div className="mb-6 mt-6 flex flex-wrap items-center gap-3">
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Target className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black">Mes erreurs</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Les questions ratées en épreuve s&apos;ajoutent ici. Réussis-les en révision pour
              les retirer.
            </p>
          </div>
          <Link
            href="/seance"
            className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-bold text-stone-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 dark:border-stone-800 dark:bg-[#1d1c18] dark:text-stone-200 dark:hover:bg-stone-800"
          >
            <Shuffle className="h-4 w-4" />
            Séance personnalisée
          </Link>
        </div>

        {entries === null ? null : (
          <>
            {unfinished && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
                <div className="text-sm text-amber-900 dark:text-amber-100">
                  <span className="font-bold">Séance en cours : </span>
                  {unfinished.title}
                </div>
                <Link
                  href="/qcm/revision"
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-700"
                >
                  <Play className="h-4 w-4" />
                  Reprendre
                </Link>
              </div>
            )}

            {total === 0 ? (
              <div className="rounded-lg border border-dashed border-stone-300 p-10 text-center dark:border-stone-700">
                <p className="font-bold">Aucune erreur à revoir pour le moment.</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-stone-500 dark:text-stone-400">
                  Passe une épreuve et soumets un dossier : les questions que tu rates seront
                  listées ici pour que tu puisses les retravailler. Seules les épreuves passées
                  à partir de maintenant sont suivies.
                </p>
                <Link
                  href="/"
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
                >
                  Choisir une épreuve
                </Link>
              </div>
            ) : (
              <>
                <section className="mb-6 rounded-lg border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#1d1c18]">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-3xl font-black">
                        {total} {plural(total, "question")} à revoir
                      </p>
                      <p className="text-sm text-stone-500 dark:text-stone-400">
                        dans {groups.length} {plural(groups.length, "épreuve")}
                      </p>
                    </div>

                    <button
                      onClick={() => startSession("Mes erreurs", entries)}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-5 py-3 font-bold text-white transition hover:bg-emerald-700"
                    >
                      <Play className="h-4 w-4" />
                      Réviser {sessionSize} {plural(sessionSize, "question")}
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
                    Les plus souvent ratées passent en premier ; une séance contient au plus{" "}
                    {PRACTICE_SESSION_SIZE} questions.
                  </p>
                </section>

                <section className="rounded-lg border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-[#1d1c18]">
                  <h2 className="border-b border-stone-100 px-5 py-3 text-sm font-black uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:text-stone-400">
                    Par épreuve
                  </h2>

                  <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                    {groups.map((group) => (
                      <li
                        key={`${group.slug}-${group.annee}`}
                        className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-bold">
                            {group.matiere} — {group.annee}
                          </p>
                          <p className="text-xs text-stone-500 dark:text-stone-400">
                            {group.count} {plural(group.count, "erreur")} · dernière{" "}
                            {formatRelative(group.lastWrongAt)}
                          </p>
                        </div>

                        <button
                          onClick={() =>
                            startSession(
                              `${group.matiere} ${group.annee} — mes erreurs`,
                              entries.filter(
                                (entry) => entry.slug === group.slug && entry.annee === group.annee
                              )
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm font-bold text-stone-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Réviser
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>

                <div className="mt-6 text-right">
                  <button
                    onClick={handleClear}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-stone-500 transition hover:text-red-600 dark:text-stone-400 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                    Effacer toutes mes erreurs
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
