import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, Percent, ShieldCheck, Sparkles, Target, Trophy, Users } from "lucide-react";
import { getPublicProfileByHandle } from "@/lib/server/socialProfile";
import { ACHIEVEMENTS, ACHIEVEMENT_ICONS } from "@/lib/achievements";
import FollowButton from "@/components/FollowButton";

export const dynamic = "force-dynamic";

interface ProfilPageProps {
  params: Promise<{ handle: string }>;
}

function formatMemberSince(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default async function ProfilPage({ params }: ProfilPageProps) {
  const { handle } = await params;
  const profile = getPublicProfileByHandle(handle);

  if (!profile) notFound();

  const avatarSrc = profile.avatarPath || profile.picture;
  const earnedKeys = new Set(profile.achievements.map((achievement) => achievement.key));

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-10 text-stone-950 dark:bg-[#151512] dark:text-stone-100">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 transition-colors hover:text-stone-950 dark:text-stone-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l&apos;accueil
        </Link>

        <section className="mt-6 rounded-lg border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-[#1d1c18]">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc}
                  alt={profile.name}
                  className="h-20 w-20 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-emerald-50 text-2xl font-black text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {profile.name.charAt(0)}
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight">{profile.name}</h1>
                  {profile.role === "administrateur" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Administrateur
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                  Membre depuis {formatMemberSince(profile.memberSince)}
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-sm text-stone-600 dark:text-stone-300">
                  <Users className="h-4 w-4" />
                  <span className="font-bold">{profile.followers}</span> abonné(e)s
                  <span className="text-stone-300 dark:text-stone-600">·</span>
                  <span className="font-bold">{profile.following}</span> abonnements
                </div>
              </div>
            </div>

            <FollowButton targetHandle={profile.handle} targetSub={profile.sub} />
          </div>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={BookOpen} label="Épreuves" value={profile.stats.totalAttempts} />
          <StatCard icon={Target} label="Matières" value={profile.stats.distinctMatieres} />
          <StatCard icon={Percent} label="Moyenne" value={`${profile.stats.avgScorePercent}%`} />
          <StatCard icon={Trophy} label="Sans-fautes" value={profile.stats.perfectScores} />
        </section>

        <section className="mt-6 rounded-lg border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-[#1d1c18]">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black">Succès</h2>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                {profile.achievements.length}/{ACHIEVEMENTS.length} débloqués
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {ACHIEVEMENTS.map((achievement) => {
              const Icon = ACHIEVEMENT_ICONS[achievement.icon];
              const earned = earnedKeys.has(achievement.key);

              return (
                <div
                  key={achievement.key}
                  className={`rounded-lg border p-3 text-center transition ${
                    earned
                      ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                      : "border-stone-200 bg-stone-50 opacity-50 dark:border-stone-800 dark:bg-[#151512]"
                  }`}
                  title={achievement.description}
                >
                  <div
                    className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full ${
                      earned
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                        : "bg-stone-200 text-stone-400 dark:bg-stone-800 dark:text-stone-500"
                    }`}
                  >
                    {Icon ? <Icon className="h-5 w-5" /> : null}
                  </div>
                  <p className="text-xs font-bold">{achievement.title}</p>
                  <p className="mt-0.5 text-[11px] leading-tight text-stone-500 dark:text-stone-400">
                    {achievement.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 text-center shadow-sm dark:border-stone-800 dark:bg-[#1d1c18]">
      <Icon className="mx-auto h-5 w-5 text-emerald-700 dark:text-emerald-300" />
      <p className="mt-2 text-xl font-black">{value}</p>
      <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">{label}</p>
    </div>
  );
}
