"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bug,
  Rocket,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

type ChangelogTag = "nouveaute" | "amelioration" | "correction";

interface ChangelogEntry {
  id: string;
  date: string;
  tag: ChangelogTag;
  title: string;
  description: string;
}

interface TagConfig {
  label: string;
  icon: LucideIcon;
  dot: string;
  badge: string;
}

const TAG_CONFIG: Record<ChangelogTag, TagConfig> = {
  nouveaute: {
    label: "Nouveauté",
    icon: Sparkles,
    dot: "bg-emerald-600 dark:bg-emerald-500",
    badge:
      "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  amelioration: {
    label: "Amélioration",
    icon: Rocket,
    dot: "bg-sky-600 dark:bg-sky-500",
    badge: "bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
  },
  correction: {
    label: "Correction",
    icon: Bug,
    dot: "bg-amber-600 dark:bg-amber-500",
    badge:
      "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  },
};

const FILTERS: { value: ChangelogTag | "tout"; label: string }[] = [
  { value: "tout", label: "Tout" },
  { value: "nouveaute", label: "Nouveautés" },
  { value: "amelioration", label: "Améliorations" },
  { value: "correction", label: "Corrections" },
];

function formatDayLabel(dateStr: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateStr}T00:00:00`));
}

function groupByDate(entries: ChangelogEntry[]) {
  const groups = new Map<string, ChangelogEntry[]>();

  entries.forEach((entry) => {
    const current = groups.get(entry.date) || [];
    current.push(entry);
    groups.set(entry.date, current);
  });

  return Array.from(groups.entries()).sort((a, b) =>
    b[0].localeCompare(a[0])
  );
}

export default function MisesAJourPage() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ChangelogTag | "tout">("tout");

  useEffect(() => {
    async function loadChangelog() {
      try {
        const response = await fetch("/data/changelog.json?t=" + Date.now());
        const data = (await response.json()) as ChangelogEntry[];
        const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date));
        setEntries(sorted);
      } catch (error) {
        console.error("Erreur chargement changelog:", error);
      } finally {
        setLoading(false);
      }
    }

    loadChangelog();
  }, []);

  const counts = useMemo(() => {
    return entries.reduce(
      (acc, entry) => {
        acc[entry.tag] = (acc[entry.tag] || 0) + 1;
        return acc;
      },
      {} as Record<ChangelogTag, number>
    );
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (filter === "tout") return entries;
    return entries.filter((entry) => entry.tag === filter);
  }, [entries, filter]);

  const groupedEntries = useMemo(
    () => groupByDate(filteredEntries),
    [filteredEntries]
  );

  return (
    <main className="min-h-screen bg-stone-50 text-stone-950 dark:bg-black dark:text-stone-100">
      <section className="border-b border-stone-200 bg-white dark:border-stone-800 dark:bg-black">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-stone-500 transition-colors hover:text-emerald-800 dark:text-stone-400 dark:hover:text-emerald-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à l&apos;accueil
          </Link>

          <p className="mt-6 text-sm font-black uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
            Journal des changements
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
            Mises à jour
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-stone-600 dark:text-stone-300">
            Medecine Hub évolue en continu : nouvelles fonctionnalités,
            améliorations et corrections. Tout ce qui change est listé ici,
            avec la date.
          </p>

          <div className="mt-7 flex flex-wrap gap-2">
            {FILTERS.map((item) => {
              const isActive = filter === item.value;
              const count =
                item.value === "tout"
                  ? entries.length
                  : counts[item.value] || 0;

              return (
                <button
                  key={item.value}
                  onClick={() => setFilter(item.value)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-bold transition-colors ${
                    isActive
                      ? "border-stone-950 bg-stone-950 text-white dark:border-emerald-500 dark:bg-emerald-600"
                      : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50 dark:border-stone-800 dark:bg-black dark:text-stone-300 dark:hover:bg-stone-900"
                  }`}
                >
                  {item.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-xs ${
                      isActive
                        ? "bg-white/20"
                        : "bg-stone-100 dark:bg-stone-900"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {loading ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-stone-300 border-b-emerald-800 dark:border-stone-800 dark:border-b-emerald-300" />
            <p className="text-sm font-semibold text-stone-500">
              Chargement du journal...
            </p>
          </div>
        ) : groupedEntries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-200 p-10 text-center dark:border-stone-800">
            <p className="text-sm text-stone-500">
              Aucune mise à jour pour cette catégorie pour le moment.
            </p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute bottom-0 left-[15px] top-2 w-px bg-stone-200 dark:bg-stone-800" />

            <div className="space-y-10">
              {groupedEntries.map(([date, dayEntries]) => (
                <div key={date}>
                  <div className="relative mb-5 flex items-center gap-4 pl-9">
                    <div className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-4 border-stone-50 bg-stone-400 dark:border-black dark:bg-stone-600" />
                    <h2 className="text-sm font-black uppercase tracking-wide text-stone-500 dark:text-stone-400">
                      {formatDayLabel(date)}
                    </h2>
                  </div>

                  <div className="space-y-4 pl-9">
                    {dayEntries.map((entry) => {
                      const config = TAG_CONFIG[entry.tag];
                      const Icon = config.icon;

                      return (
                        <div key={entry.id} className="relative">
                          <div
                            className={`absolute -left-9 top-5 flex h-8 w-8 items-center justify-center rounded-full text-white shadow-sm ${config.dot}`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>

                          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-stone-800 dark:bg-stone-950">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-black ${config.badge}`}
                              >
                                {config.label}
                              </span>
                            </div>

                            <h3 className="mt-3 text-lg font-black tracking-tight">
                              {entry.title}
                            </h3>

                            <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">
                              {entry.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
