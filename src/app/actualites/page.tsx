"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Newspaper, Sparkles, UserPlus, Users } from "lucide-react";
import { getLocalUserProfile } from "@/lib/userProfile";
import { ACHIEVEMENTS_BY_KEY, ACHIEVEMENT_ICONS } from "@/lib/achievements";

interface FeedEvent {
  type: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
  actor: {
    handle: string;
    name: string;
    picture?: string;
    avatarPath?: string;
  };
}

function formatRelativeDate(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes < 1) return "à l'instant";
  if (diffMinutes < 60) return `il y a ${diffMinutes} min`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `il y a ${diffHours} h`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `il y a ${diffDays} j`;

  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(
    new Date(iso)
  );
}

function EventText({ event }: { event: FeedEvent }) {
  if (event.type === "achievement_unlocked") {
    const key = event.payload?.achievementKey;
    const achievement = typeof key === "string" ? ACHIEVEMENTS_BY_KEY[key] : undefined;

    return (
      <span>
        a débloqué le succès{" "}
        <span className="font-bold text-emerald-800 dark:text-emerald-300">
          {achievement?.title ?? "un succès"}
        </span>
      </span>
    );
  }

  if (event.type === "joined") {
    return <span>a rejoint Medecine Hub</span>;
  }

  return <span>a une nouvelle activité</span>;
}

function EventIcon({ event }: { event: FeedEvent }) {
  if (event.type === "achievement_unlocked") {
    const key = event.payload?.achievementKey;
    const achievement = typeof key === "string" ? ACHIEVEMENTS_BY_KEY[key] : undefined;
    const Icon = achievement ? ACHIEVEMENT_ICONS[achievement.icon] : Sparkles;

    return <Icon className="h-4 w-4" />;
  }

  if (event.type === "joined") return <UserPlus className="h-4 w-4" />;

  return <Sparkles className="h-4 w-4" />;
}

export default function ActualitesPage() {
  const router = useRouter();
  const [events, setEvents] = useState<FeedEvent[] | null>(null);

  useEffect(() => {
    const profile = getLocalUserProfile();

    if (!profile) {
      router.push("/connexion");
      return;
    }

    fetch(`/api/social/feed?sub=${encodeURIComponent(profile.sub)}`)
      .then((response) => response.json())
      .then((result: { success: boolean; events?: FeedEvent[] }) => {
        setEvents(result.success ? result.events ?? [] : []);
      })
      .catch(() => setEvents([]));
  }, [router]);

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-10 text-stone-950 dark:bg-[#151512] dark:text-stone-100">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Newspaper className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black">Actualités</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              L&apos;activité des membres que tu suis.
            </p>
          </div>
        </div>

        {events === null && (
          <p className="text-sm text-stone-500 dark:text-stone-400">Chargement...</p>
        )}

        {events && events.length === 0 && (
          <div className="rounded-lg border border-dashed border-stone-300 p-8 text-center dark:border-stone-700">
            <Users className="mx-auto h-8 w-8 text-stone-400 dark:text-stone-500" />
            <p className="mt-3 text-sm font-semibold text-stone-600 dark:text-stone-300">
              Ton fil est vide pour le moment.
            </p>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              Abonne-toi à d&apos;autres membres pour voir leurs succès ici.
            </p>
            <Link
              href="/membres"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
            >
              Découvrir les membres
            </Link>
          </div>
        )}

        {events && events.length > 0 && (
          <div className="space-y-3">
            {events.map((event, index) => {
              const avatarSrc = event.actor.avatarPath || event.actor.picture;

              return (
                <div
                  key={`${event.actor.handle}-${event.createdAt}-${index}`}
                  className="flex items-start gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-[#1d1c18]"
                >
                  <Link href={`/profil/${event.actor.handle}`} className="shrink-0">
                    {avatarSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarSrc}
                        alt={event.actor.name}
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-sm font-black text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                        {event.actor.name.charAt(0)}
                      </div>
                    )}
                  </Link>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <Link
                        href={`/profil/${event.actor.handle}`}
                        className="font-bold hover:text-emerald-800 dark:hover:text-emerald-300"
                      >
                        {event.actor.name}
                      </Link>{" "}
                      <EventText event={event} />
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                      <EventIcon event={event} />
                      {formatRelativeDate(event.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
