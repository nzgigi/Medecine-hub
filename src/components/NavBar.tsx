"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Heart,
  Home,
  Mail,
  Menu,
  Scale,
  X,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navigation = [
    { name: "Accueil", href: "/", icon: Home },
    { name: "Mentions légales", href: "/mentions-legales", icon: Scale },
    { name: "Contact", href: "/contact", icon: Mail },
  ];

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const isActive = (href: string) => pathname === href;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95">
      <nav
        className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        aria-label="Navigation principale"
      >
        {/* Logo */}
        <Link
          href="/"
          className="group flex items-center gap-3"
          aria-label="Medecine Hub - Accueil"
        >
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white transition-colors duration-200 group-hover:border-blue-300 dark:border-slate-700 dark:group-hover:border-blue-700">
            <Image
              src="/brand/pfp.png"
              alt="Logo Medecine Hub"
              fill
              priority
              sizes="44px"
              className="object-cover"
            />
          </div>

          <div className="flex flex-col">
            <span className="text-[17px] font-bold tracking-tight text-slate-900 dark:text-white">
              Medecine Hub
            </span>

            <span className="text-[11px] font-medium tracking-wide text-slate-500 dark:text-slate-400">
              Annales de médecine
            </span>
          </div>
        </Link>

        {/* Navigation desktop */}
        <div className="hidden items-center gap-1 md:flex">
          {navigation.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-200 ${
                  active
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
                }`}
              >
                {item.name}
              </Link>
            );
          })}

          <div className="ml-2 border-l border-slate-200 pl-3 dark:border-slate-800">
            <ThemeToggle variant="desktop" />
          </div>

          <Link
            href="/soutenir"
            className="ml-3 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-blue-700"
          >
            <Heart className="h-4 w-4" strokeWidth={2.2} />
            Soutenir
          </Link>
        </div>

        {/* Actions mobiles */}
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle variant="icon" />

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
            aria-label={
              mobileMenuOpen
                ? "Fermer le menu de navigation"
                : "Ouvrir le menu de navigation"
            }
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </nav>

      {/* Navigation mobile */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 pb-4 pt-3 dark:border-slate-800 dark:bg-slate-950 md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors duration-200 ${
                    active
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}

            <Link
              href="/soutenir"
              className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-blue-700"
            >
              <Heart className="h-4 w-4" strokeWidth={2.2} />
              Soutenir le projet
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}