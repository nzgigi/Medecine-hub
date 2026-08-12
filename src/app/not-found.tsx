import Link from "next/link";
import { Home, Search, BookOpen, Stethoscope } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4 text-stone-950 dark:bg-[#151512] dark:text-stone-100">
      <div className="mx-auto w-full max-w-xl text-center">
        <div className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-bold text-stone-700 dark:border-stone-800 dark:bg-[#1d1c18] dark:text-stone-300">
          <Stethoscope className="h-4 w-4 text-emerald-800 dark:text-emerald-300" />
          Medecine Hub
        </div>

        <div className="mx-auto mt-8 flex h-20 w-20 items-center justify-center rounded-full border border-stone-200 bg-white text-emerald-800 dark:border-stone-800 dark:bg-[#1d1c18] dark:text-emerald-300">
          <Search className="h-9 w-9" />
        </div>

        <h1 className="mt-6 text-7xl font-black tracking-tight text-stone-950 dark:text-white sm:text-8xl">
          404
        </h1>

        <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
          Page introuvable
        </h2>

        <p className="mt-4 text-base leading-7 text-stone-600 dark:text-stone-300">
          Cette page n&apos;existe pas ou a été déplacée. Retournez à
          l&apos;accueil pour continuer vos révisions.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-800 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-emerald-700"
          >
            <Home className="h-4 w-4" />
            Retour à l&apos;accueil
          </Link>

          <Link
            href="/#matieres"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-5 py-3 text-sm font-bold text-stone-800 transition-colors hover:bg-stone-50 dark:border-stone-800 dark:bg-[#151512] dark:text-stone-200 dark:hover:bg-[#1d1c18]"
          >
            <BookOpen className="h-4 w-4" />
            Voir les matières
          </Link>
        </div>
      </div>
    </main>
  );
}
