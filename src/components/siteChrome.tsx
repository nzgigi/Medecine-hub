"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  Heart,
  Mail,
  Scale,
} from "lucide-react";
import Navbar from "./NavBar";

export default function SiteChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isNzPage = pathname === "/nz";
  const currentYear = new Date().getFullYear();

  if (isNzPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />

      {/* Ne pas utiliser <main> ici :
          certaines pages possèdent déjà leur propre balise <main>. */}
      <div className="min-h-screen">{children}</div>

      <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        {/* Bloc visuel avec la bannière */}
        <section className="px-4 pb-8 pt-12 sm:px-6 lg:px-8 lg:pb-10 lg:pt-16">
          <div className="relative mx-auto min-h-[300px] max-w-7xl overflow-hidden rounded-3xl bg-slate-950 sm:min-h-[340px]">
            <Image
              src="/brand/banner.jpg"
              alt="Medecine Hub"
              fill
              sizes="(max-width: 1280px) 100vw, 1280px"
              className="object-cover object-center"
            />

            {/* Voiles pour garantir la lisibilité du texte */}
            <div className="absolute inset-0 bg-slate-950/70" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/30" />

            {/* Grille discrète */}
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(148,163,184,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.14) 1px, transparent 1px)",
                backgroundSize: "34px 34px",
              }}
            />

            <div className="relative flex min-h-[300px] items-center px-6 py-10 sm:min-h-[340px] sm:px-10 lg:px-14">
              <div className="max-w-2xl">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-300">
                  Medecine Hub
                </p>

                <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Une plateforme gratuite pensée pour vos révisions.
                </h2>

                <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
                  Retrouvez vos annales, entraînez-vous sur des QCM médicaux et
                  progressez à votre rythme sans abonnement et sans création de
                  compte.
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/#matieres"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-500"
                  >
                    Commencer à réviser
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <Link
                    href="/soutenir"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/15"
                  >
                    <Heart className="h-4 w-4" />
                    Soutenir le projet
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer classique */}
        <div className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
          <div className="border-t border-slate-200 pt-8 dark:border-slate-800">
            <div className="flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
              {/* Marque */}
              <Link href="/" className="flex items-center gap-3">
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700">
                  <Image
                    src="/brand/pfp.png"
                    alt="Logo Medecine Hub"
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                </div>

                <div>
                  <p className="text-base font-bold tracking-tight text-slate-950 dark:text-white">
                    Medecine Hub
                  </p>

                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Annales gratuites de médecine
                  </p>
                </div>
              </Link>

              {/* Navigation secondaire */}
              <nav
                aria-label="Navigation secondaire"
                className="flex flex-wrap gap-x-5 gap-y-3"
              >
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-300"
                >
                  <Mail className="h-4 w-4" />
                  Contact
                </Link>

                <Link
                  href="/mentions-legales"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-300"
                >
                  <Scale className="h-4 w-4" />
                  Mentions légales
                </Link>

                <Link
                  href="/soutenir"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-300"
                >
                  <Heart className="h-4 w-4" />
                  Nous soutenir
                </Link>
              </nav>
            </div>

            <div className="mt-8 flex flex-col gap-2 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500 dark:border-slate-800 dark:text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <p>
                © {currentYear} Medecine Hub. Plateforme gratuite pour étudiants
                en médecine.
              </p>

              <p>DFASM1 et DFASM2 · Annales 2023, 2024 et 2025</p>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}