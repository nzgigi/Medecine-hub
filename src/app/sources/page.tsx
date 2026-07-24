"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  FolderOpen,
  GraduationCap,
  Landmark,
  type LucideIcon,
} from "lucide-react";

interface SourceEntry {
  id: string;
  name: string;
  url: string;
  type: string;
  description: string;
}

interface TypeConfig {
  label: string;
  icon: LucideIcon;
}

const TYPE_CONFIG: Record<string, TypeConfig> = {
  universite: { label: "Université", icon: GraduationCap },
  plateforme: { label: "Plateforme", icon: FolderOpen },
};

const DEFAULT_TYPE_CONFIG: TypeConfig = {
  label: "Établissement",
  icon: Landmark,
};

function getTypeConfig(type: string): TypeConfig {
  return TYPE_CONFIG[type] || DEFAULT_TYPE_CONFIG;
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function SourcesPage() {
  const [sources, setSources] = useState<SourceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSources() {
      try {
        const response = await fetch("/data/sources.json?t=" + Date.now());
        const data = (await response.json()) as SourceEntry[];
        setSources(data);
      } catch (error) {
        console.error("Erreur chargement sources:", error);
      } finally {
        setLoading(false);
      }
    }

    loadSources();
  }, []);

  const sortedSources = useMemo(
    () => [...sources].sort((a, b) => a.name.localeCompare(b.name)),
    [sources]
  );

  return (
    <main className="min-h-screen bg-stone-50 text-stone-950 dark:bg-[#151512] dark:text-stone-100">
      <section className="border-b border-stone-200 bg-white dark:border-stone-800 dark:bg-[#151512]">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-stone-500 transition-colors hover:text-emerald-800 dark:text-stone-400 dark:hover:text-emerald-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à l&apos;accueil
          </Link>

          <p className="mt-6 text-sm font-black uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
            Transparence
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
            Sources
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-stone-600 dark:text-stone-300">
            Medecine Hub s&apos;appuie sur des contenus provenant de plusieurs
            établissements. Cette page liste les sources utilisées pour
            construire les annales et QCM de la plateforme.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {loading ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-stone-300 border-b-emerald-800 dark:border-stone-800 dark:border-b-emerald-300" />
            <p className="text-sm font-semibold text-stone-500">
              Chargement des sources...
            </p>
          </div>
        ) : sortedSources.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-200 p-10 text-center dark:border-stone-800">
            <p className="text-sm text-stone-500">
              Aucune source référencée pour le moment.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {sortedSources.map((source) => {
              const config = getTypeConfig(source.type);
              const Icon = config.icon;

              return (
                <a
                  key={source.id}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-stone-800 dark:bg-[#151512]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <Icon className="h-6 w-6" />
                    </div>

                    <ExternalLink className="h-4 w-4 text-stone-300 transition-colors group-hover:text-emerald-700 dark:text-stone-700 dark:group-hover:text-emerald-300" />
                  </div>

                  <p className="mt-4 text-xs font-black uppercase tracking-wide text-stone-400 dark:text-stone-500">
                    {config.label}
                  </p>

                  <h2 className="mt-1 text-lg font-black tracking-tight group-hover:text-emerald-800 dark:group-hover:text-emerald-300">
                    {source.name}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">
                    {source.description}
                  </p>

                  <p className="mt-4 text-xs font-semibold text-stone-400 dark:text-stone-500">
                    {getHostname(source.url)}
                  </p>
                </a>
              );
            })}
          </div>
        )}

        <p className="mt-8 text-xs leading-5 text-stone-500 dark:text-stone-500">
          Une source manquante ou une erreur à signaler ? Contactez-nous depuis
          la page Contact.
        </p>
      </section>
    </main>
  );
}
