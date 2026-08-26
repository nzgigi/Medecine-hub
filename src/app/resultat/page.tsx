import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Trophy } from "lucide-react";
import { parseScoreShareParams, type ScoreShareParams } from "@/lib/shareScore";
import { verifyScoreShareSignature } from "@/lib/server/scoreShareSignature";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function resolveVerifiedParams(
  searchParams: PageProps["searchParams"]
): Promise<{ params: ScoreShareParams; sig: string; verified: boolean }> {
  const raw = await searchParams;
  const params = parseScoreShareParams(raw);
  const rawSig = raw.sig;
  const sig = (Array.isArray(rawSig) ? rawSig[0] : rawSig) || "";

  return { params, sig, verified: verifyScoreShareSignature(params, sig) };
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { params, sig, verified } = await resolveVerifiedParams(searchParams);

  if (!verified) {
    return {
      title: "Résultat introuvable",
      description: "Ce lien de résultat n'est pas valide ou a expiré.",
    };
  }

  const { matiere, annee, score } = params;

  const title = `${score.toFixed(2)}/20 en ${matiere}`;
  const description = `Résultat obtenu sur Medecine Hub : ${score.toFixed(2)}/20 en ${matiere} (${annee}). Entraîne-toi gratuitement aussi avec des QCM d'annales.`;

  const ogQuery = new URLSearchParams({
    matiere,
    annee: String(annee),
    score: score.toFixed(2),
    sig,
  });
  const ogImage = `/api/og/score?${ogQuery.toString()}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: "/resultat",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ResultatPage({ searchParams }: PageProps) {
  const { params, verified } = await resolveVerifiedParams(searchParams);

  if (!verified) {
    redirect("/");
  }

  const { slug, matiere, annee, score } = params;

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4 py-16 dark:bg-[#151512]">
      <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm dark:border-stone-800 dark:bg-[#1d1c18]">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <Trophy className="h-7 w-7" />
        </div>

        <p className="text-sm font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          Résultat partagé
        </p>

        <div className="mt-3 flex items-baseline justify-center gap-2">
          <span className="text-6xl font-black text-stone-950 dark:text-white">
            {score.toFixed(2)}
          </span>
          <span className="text-2xl font-bold text-stone-400 dark:text-stone-500">/20</span>
        </div>

        <p className="mt-3 text-lg font-semibold text-stone-700 dark:text-stone-200">
          {matiere} · {annee}
        </p>

        <p className="mt-6 text-sm text-stone-500 dark:text-stone-400">
          Medecine Hub propose des centaines de QCM d&apos;annales gratuits, classés par
          matière et par année, pour réviser DFASM1 et DFASM2.
        </p>

        <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          {slug && (
            <Link
              href={`/qcm/${encodeURIComponent(slug)}/${annee}`}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-800 px-5 py-3 font-bold text-white transition-colors hover:bg-emerald-700"
            >
              Tenter cette épreuve
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-200 px-5 py-3 font-bold text-stone-700 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            Découvrir Medecine Hub
          </Link>
        </div>
      </div>
    </div>
  );
}
