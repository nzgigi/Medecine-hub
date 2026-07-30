"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Mail, Scale } from "lucide-react";
import Navbar from "./NavBar";

export default function SiteChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isNzPage = pathname === "/nz";
  const isExamPage = pathname?.startsWith("/qcm/") ?? false;
  const isMedTokPage = pathname?.startsWith("/medtok") ?? false;
  const currentYear = new Date().getFullYear();

  if (isNzPage || isExamPage || isMedTokPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />

      <div className="min-h-screen">{children}</div>

      <footer className="border-t border-stone-200 bg-white dark:border-stone-800 dark:bg-[#151512]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative h-12 w-12 shrink-0">
                <Image
                  src="/brand/pfp-v2.png"
                  alt="Logo Medecine Hub"
                  fill
                  sizes="48px"
                  className="object-contain"
                />
              </div>

              <div>
                <p className="text-base font-bold tracking-tight text-stone-950 dark:text-stone-100">
                  Medecine Hub
                </p>

                <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                  Annales gratuites de medecine
                </p>
              </div>
            </Link>

            <nav
              aria-label="Navigation secondaire"
              className="flex flex-wrap gap-x-5 gap-y-3"
            >
              <Link
                href="/contact"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 transition-colors hover:text-emerald-800 dark:text-stone-400 dark:hover:text-emerald-300"
              >
                <Mail className="h-4 w-4" />
                Contact
              </Link>

              <Link
                href="/mentions-legales"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 transition-colors hover:text-emerald-800 dark:text-stone-400 dark:hover:text-emerald-300"
              >
                <Scale className="h-4 w-4" />
                Mentions legales
              </Link>

              <Link
                href="/soutenir"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 transition-colors hover:text-emerald-800 dark:text-stone-400 dark:hover:text-emerald-300"
              >
                <Heart className="h-4 w-4" />
                Nous soutenir
              </Link>
            </nav>
          </div>

          <div className="mt-8 flex flex-col gap-2 border-t border-stone-200 pt-5 text-xs leading-5 text-stone-500 dark:border-stone-800 dark:text-stone-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Copyright {currentYear} Medecine Hub. Plateforme gratuite pour etudiants
              en medecine.
            </p>

            <p>DFASM1 et DFASM2 - Annales 2023, 2024 et 2025</p>
          </div>
        </div>
      </footer>
    </>
  );
}
