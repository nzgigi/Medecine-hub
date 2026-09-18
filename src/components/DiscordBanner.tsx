"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, FileText, Megaphone, MessageCircle } from "lucide-react";
import DiscordIcon from "@/components/DiscordIcon";
import { DISCORD_INVITE_URL } from "@/lib/site";

/** En dessous, afficher "3 membres" dessert plus le serveur que ça ne l'aide : on n'affiche rien. */
const MIN_MEMBERS_TO_SHOW_COUNT = 10;

interface DiscordStats {
  members: number;
  online: number;
}

function useDiscordStats(): DiscordStats | null {
  const [stats, setStats] = useState<DiscordStats | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/discord/stats")
      .then((response) => response.json())
      .then((result: { success: boolean } & Partial<DiscordStats>) => {
        if (
          !cancelled &&
          result.success &&
          typeof result.members === "number" &&
          typeof result.online === "number" &&
          result.members >= MIN_MEMBERS_TO_SHOW_COUNT
        ) {
          setStats({ members: result.members, online: result.online });
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return stats;
}

function OnlineCount({ stats, className = "" }: { stats: DiscordStats; className?: string }) {
  return (
    <p className={`flex items-center gap-2 text-sm font-semibold ${className}`}>
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-discord-green opacity-70 motion-reduce:animate-none" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-discord-green" />
      </span>
      {stats.online} en ligne · {stats.members} membres
    </p>
  );
}

const PERKS = [
  { icon: MessageCircle, label: "Entraide" },
  { icon: Megaphone, label: "Nouveautés du site" },
  { icon: FileText, label: "Partage d'annales" },
];

interface DiscordBannerProps {
  variant?: "hero" | "compact";
  /** Variante compacte en colonne (pour un conteneur étroit) plutôt qu'en ligne. */
  stacked?: boolean;
  className?: string;
}

export default function DiscordBanner({
  variant = "hero",
  stacked = false,
  className = "",
}: DiscordBannerProps) {
  const stats = useDiscordStats();

  if (variant === "compact") {
    return (
      <a
        href={DISCORD_INVITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`group relative flex gap-4 overflow-hidden rounded-xl ${
          stacked ? "flex-col items-start p-5" : "flex-wrap items-center"
        } bg-gradient-to-br from-discord-blurple to-discord-blurple-dark ${stacked ? "" : "p-4"} text-white shadow-md shadow-discord-blurple/20 ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:shadow-lg ${className}`}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-10 h-28 w-28 rounded-full bg-discord-fuchsia/40 blur-2xl"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-10 left-1/2 h-24 w-24 rounded-full bg-discord-green/25 blur-2xl"
        />

        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-discord-blurple shadow-sm">
          <DiscordIcon className="h-6 w-6" />
        </span>

        <span className="relative min-w-0 flex-1">
          <span className="block font-black leading-tight">Rejoins-nous sur Discord</span>
          <span className="block text-sm text-white/80">
            Une question, une correction à discuter ? La communauté est là.
          </span>
          {stats && <OnlineCount stats={stats} className="mt-1 text-white/90" />}
        </span>

        <span
          className={`relative inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-black text-discord-blurple transition group-hover:bg-white/90 ${
            stacked ? "w-full justify-center" : ""
          }`}
        >
          Rejoindre
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </a>
    );
  }

  return (
    <a
      href={DISCORD_INVITE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Rejoindre le serveur Discord de Medecine Hub"
      className={`group relative block overflow-hidden rounded-2xl bg-gradient-to-br from-discord-blurple via-discord-blurple to-discord-blurple-dark text-white shadow-lg shadow-discord-blurple/25 ring-1 ring-white/10 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-discord-blurple/30 ${className}`}
    >
      {/* Halos aux couleurs de la marque Discord */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 animate-discord-float rounded-full bg-discord-fuchsia/40 blur-3xl motion-reduce:animate-none"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 animate-discord-float-slow rounded-full bg-discord-green/25 blur-3xl motion-reduce:animate-none"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -top-16 left-1/4 h-40 w-40 rounded-full bg-discord-yellow/20 blur-3xl"
      />

      {/* Grand logo en filigrane */}
      <DiscordIcon className="pointer-events-none absolute -bottom-10 -right-6 h-56 w-56 rotate-12 text-white/10 transition-transform duration-500 group-hover:rotate-6 group-hover:scale-105 sm:h-64 sm:w-64" />

      {/* Reflet qui traverse la carte au survol */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 transition-all duration-700 group-hover:left-full group-hover:opacity-100"
      />

      <div className="relative flex flex-col gap-6 p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4 sm:gap-5">
          <span className="flex h-14 w-14 shrink-0 animate-discord-wiggle items-center justify-center rounded-2xl bg-white text-discord-blurple shadow-lg motion-reduce:animate-none sm:h-16 sm:w-16">
            <DiscordIcon className="h-8 w-8 sm:h-9 sm:w-9" />
          </span>

          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-white/90">
              Communauté Discord
            </span>

            <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight sm:text-3xl">
              Révise avec d&apos;autres étudiants
            </h2>

            <p className="mt-1.5 max-w-xl text-sm leading-6 text-white/85 sm:text-base">
              Rejoins le serveur Medecine Hub : pose tes questions, partage des annales et
              suis les nouveautés du site.
            </p>

            <ul className="mt-3 flex flex-wrap gap-2">
              {PERKS.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur-sm"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
          <span className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-black text-discord-blurple shadow-md transition group-hover:bg-white/95 group-hover:shadow-lg">
            Rejoindre le serveur
            <ArrowUpRight className="h-5 w-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </span>
          {stats ? (
            <OnlineCount stats={stats} className="text-white/90" />
          ) : (
            <span className="text-xs font-semibold text-white/70">Gratuit · un clic suffit</span>
          )}
        </div>
      </div>
    </a>
  );
}
