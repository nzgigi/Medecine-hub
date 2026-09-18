"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Heart,
  Home,
  Landmark,
  Mail,
  Menu,
  Newspaper,
  Scale,
  Sparkles,
  Target,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import DiscordIcon from "./DiscordIcon";
import { DISCORD_INVITE_URL } from "@/lib/site";
import {
  getLocalUserProfile,
  getProfilePicture,
  USER_PROFILE_UPDATED_EVENT,
  type LocalUserProfile,
} from "@/lib/userProfile";
import { MISTAKES_UPDATED_EVENT, readMistakes } from "@/lib/exam/mistakes";

// Déjà présents dans le pied de page : absents de la barre desktop (contenu limité à ~1216 px),
// mais gardés dans le menu déroulant.
const MENU_ONLY_LINKS = ["/mentions-legales", "/contact"];

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profile, setProfile] = useState<LocalUserProfile | null>(null);
  const [mistakesCount, setMistakesCount] = useState(0);
  const pathname = usePathname();

  const navigation = [
    { name: "Accueil", href: "/", icon: Home, badge: 0 },
    { name: "MedTok", href: "/medtok", icon: Zap },
    { name: "Mes erreurs", href: "/erreurs", icon: Target, badge: mistakesCount },
    ...(profile ? [{ name: "Actualités", href: "/actualites", icon: Newspaper }] : []),
    { name: "Mises a jour", href: "/mises-a-jour", icon: Sparkles },
    { name: "Sources", href: "/sources", icon: Landmark },
    { name: "Mentions legales", href: "/mentions-legales", icon: Scale },
    { name: "Contact", href: "/contact", icon: Mail },
  ];

  const desktopNavigation = navigation.filter((item) => !MENU_ONLY_LINKS.includes(item.href));

  const isActive = (href: string) => pathname === href;

  const badgeOf = (item: { badge?: number }) => item.badge ?? 0;
  const profilePicture = profile ? getProfilePicture(profile) : undefined;

  useEffect(() => {
    const syncProfile = () => {
      setProfile(getLocalUserProfile());
    };

    syncProfile();
    const syncMistakes = () => setMistakesCount(Object.keys(readMistakes()).length);

    syncMistakes();
    window.addEventListener("storage", syncProfile);
    window.addEventListener("storage", syncMistakes);
    window.addEventListener(USER_PROFILE_UPDATED_EVENT, syncProfile);
    window.addEventListener(MISTAKES_UPDATED_EVENT, syncMistakes);

    return () => {
      window.removeEventListener("storage", syncProfile);
      window.removeEventListener("storage", syncMistakes);
      window.removeEventListener(USER_PROFILE_UPDATED_EVENT, syncProfile);
      window.removeEventListener(MISTAKES_UPDATED_EVENT, syncMistakes);
    };
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200 bg-white dark:border-stone-800 dark:bg-[#151512]">
      <nav
        className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        aria-label="Navigation principale"
      >
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-3"
          aria-label="Medecine Hub - Accueil"
        >
          <div className="relative h-14 w-14 shrink-0 transition-transform duration-200 group-hover:scale-105">
            <Image
              src="/brand/pfp-v2.png"
              alt="Logo Medecine Hub"
              fill
              priority
              sizes="56px"
              className="object-contain"
            />
          </div>

          <div className="flex flex-col">
            <span className="whitespace-nowrap text-[17px] font-bold tracking-tight text-stone-950 dark:text-white">
              Medecine Hub
            </span>

            <span className="whitespace-nowrap text-[11px] font-medium tracking-wide text-stone-500 dark:text-stone-400">
              Annales de medecine
            </span>
          </div>
        </Link>

        <div className="hidden items-center gap-1 xl:flex">
          {desktopNavigation.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium transition-colors duration-200 ${
                  active
                    ? "bg-emerald-50 text-emerald-800 dark:bg-[#1d1c18] dark:text-emerald-300"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-[#1d1c18] dark:hover:text-white"
                }`}
              >
                {item.name}
                {badgeOf(item) > 0 && (
                  <span className="ml-1.5 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {badgeOf(item)}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="ml-2 border-l border-stone-200 pl-3 dark:border-stone-800">
            <ThemeToggle variant="desktop" />
          </div>

          <a
            href={DISCORD_INVITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Rejoindre notre serveur Discord"
            title="Rejoindre notre Discord"
            className="ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-discord-blurple text-white shadow-sm shadow-discord-blurple/30 transition hover:-translate-y-0.5 hover:bg-discord-blurple-dark"
          >
            <DiscordIcon className="h-5 w-5" />
          </a>

          {profile ? (
            <Link
              href="/compte"
              className={`ml-2 flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border transition-colors ${
                isActive("/compte")
                  ? "border-emerald-700 bg-emerald-50 text-emerald-800 dark:border-emerald-600 dark:bg-[#1d1c18] dark:text-emerald-300"
                  : "border-stone-200 bg-white text-stone-700 hover:bg-stone-100 dark:border-stone-800 dark:bg-[#151512] dark:text-stone-200 dark:hover:bg-[#1d1c18]"
              }`}
              aria-label="Mon compte"
              title="Mon compte"
            >
              {profilePicture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profilePicture}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserRound className="h-5 w-5" />
              )}
            </Link>
          ) : (
            <Link
              href="/connexion"
              className="ml-2 rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-100 dark:border-stone-800 dark:bg-[#151512] dark:text-stone-100 dark:hover:bg-[#1d1c18]"
            >
              Se connecter
            </Link>
          )}

          <Link
            href="/soutenir"
            className="ml-3 flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-700"
          >
            <Heart className="h-4 w-4" strokeWidth={2.2} />
            Soutenir
          </Link>
        </div>

        <div className="flex items-center gap-1 xl:hidden">
          <ThemeToggle variant="icon" />

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-stone-700 transition-colors hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-[#1d1c18]"
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

      {mobileMenuOpen && (
        <div className="border-t border-stone-200 bg-white px-4 pb-4 pt-3 dark:border-stone-800 dark:bg-[#151512] xl:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors duration-200 ${
                    active
                      ? "bg-emerald-50 text-emerald-800 dark:bg-[#1d1c18] dark:text-emerald-300"
                      : "text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-[#1d1c18]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                  {badgeOf(item) > 0 && (
                    <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {badgeOf(item)}
                    </span>
                  )}
                </Link>
              );
            })}

            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-lg bg-discord-blurple px-3 py-3 text-sm font-bold text-white transition-colors hover:bg-discord-blurple-dark"
            >
              <DiscordIcon className="h-4 w-4" />
              Rejoindre notre Discord
            </a>

            <Link
              href={profile ? "/compte" : "/connexion"}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors duration-200 ${
                isActive("/compte") || isActive("/connexion")
                  ? "bg-emerald-50 text-emerald-800 dark:bg-[#1d1c18] dark:text-emerald-300"
                  : "text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-[#1d1c18]"
              }`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-stone-200 dark:border-stone-800">
                {profilePicture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profilePicture}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserRound className="h-4 w-4" />
                )}
              </span>
              {profile ? "Mon compte" : "Se connecter"}
            </Link>

            <Link
              href="/soutenir"
              onClick={() => setMobileMenuOpen(false)}
              className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-700"
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
