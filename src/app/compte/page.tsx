"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Camera,
  CheckCircle2,
  Clock3,
  Crown,
  LogOut,
  Medal,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  User as UserIcon,
  Users,
} from "lucide-react";
import { ACHIEVEMENTS, ACHIEVEMENT_ICONS } from "@/lib/achievements";
import {
  clearLocalUserProfile,
  getLocalUserProfile,
  getProfilePicture,
  updateLocalUserProfile,
  type LocalUserProfile,
} from "@/lib/userProfile";
import {
  ALLOWED_AVATAR_ACCEPT,
  ALLOWED_AVATAR_MIME_TYPES,
  MAX_AVATAR_SIZE_BYTES,
  MAX_AVATAR_SIZE_LABEL,
} from "@/lib/avatarUpload";

interface QcmHistoryItem {
  matiere: string;
  annee: number;
  score: number;
  total: number;
  date: string;
}

interface MatiereIndexEntry {
  matiere: string;
  slug: string;
  annee: number;
  total_questions: number;
  examTitle?: string;
}

interface CategoryLeaderboardRow {
  matiere: string;
  attempts: number;
  best: number;
  average: number;
  latestDate: string;
}

interface SocialProfileSummary {
  handle: string;
  role: "etudiant" | "administrateur";
  followers: number;
  following: number;
  stats: {
    totalAttempts: number;
    distinctMatieres: number;
    bestScorePercent: number;
    avgScorePercent: number;
    perfectScores: number;
  };
  achievements: { key: string; title: string; description: string; icon: string }[];
}

function getHistory() {
  try {
    return JSON.parse(
      localStorage.getItem("qcm_history") || "[]"
    ) as QcmHistoryItem[];
  } catch {
    return [];
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getRankLabel(index: number) {
  if (index === 0) return "1er";
  return `${index + 1}e`;
}

function buildCategoryLeaderboard(history: QcmHistoryItem[]) {
  const grouped = new Map<string, QcmHistoryItem[]>();

  history.forEach((item) => {
    const currentItems = grouped.get(item.matiere) || [];
    currentItems.push(item);
    grouped.set(item.matiere, currentItems);
  });

  return Array.from(grouped.entries())
    .map(([matiere, items]) => {
      const totalScore = items.reduce((acc, item) => acc + item.score, 0);
      const latestDate = items.reduce((latest, item) => {
        return new Date(item.date).getTime() > new Date(latest).getTime()
          ? item.date
          : latest;
      }, items[0]?.date || new Date().toISOString());

      return {
        matiere,
        attempts: items.length,
        best: Math.max(...items.map((item) => item.score)),
        average: totalScore / items.length,
        latestDate,
      };
    })
    .sort((a, b) => {
      if (b.average !== a.average) return b.average - a.average;
      if (b.best !== a.best) return b.best - a.best;
      return b.attempts - a.attempts;
    });
}

function LeaderboardRankIcon({ index }: { index: number }) {
  if (index === 0) return <Crown className="h-5 w-5 text-emerald-700" />;
  if (index === 1) return <Medal className="h-5 w-5 text-stone-500" />;
  if (index === 2) return <Medal className="h-5 w-5 text-amber-700" />;

  return (
    <span className="flex h-5 w-5 items-center justify-center text-xs font-black text-stone-500">
      {index + 1}
    </span>
  );
}

export default function ComptePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<LocalUserProfile | null>(null);
  const [history, setHistory] = useState<QcmHistoryItem[]>([]);
  const [indexEntries, setIndexEntries] = useState<MatiereIndexEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [avatarError, setAvatarError] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [selectedMatiere, setSelectedMatiere] = useState("global");
  const [socialProfile, setSocialProfile] = useState<SocialProfileSummary | null>(null);

  useEffect(() => {
    const localProfile = getLocalUserProfile();

    if (!localProfile) {
      router.push("/connexion");
      return;
    }

    setProfile(localProfile);
    const localHistory = getHistory();
    setHistory(localHistory);
    const sub = localProfile.sub;

    async function loadIndex() {
      try {
        const response = await fetch("/data/qcm/index.json?t=" + Date.now());
        const data = (await response.json()) as MatiereIndexEntry[];
        setIndexEntries(data);
      } finally {
        setLoading(false);
      }
    }

    async function syncHistoryToServer() {
      try {
        const response = await fetch("/api/users/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sub, attempts: localHistory }),
        });

        const result = (await response.json()) as {
          success: boolean;
          profile?: SocialProfileSummary;
        };

        if (result.success && result.profile) {
          setSocialProfile(result.profile);
        }
      } catch {
        // pas grave si la synchro échoue, les stats restent disponibles localement
      }
    }

    loadIndex();
    syncHistoryToServer();
  }, [router]);

  const stats = useMemo(() => {
    const attempts = history.length;
    const average =
      attempts > 0
        ? history.reduce((acc, item) => acc + item.score, 0) / attempts
        : 0;
    const best = history.reduce(
      (bestScore, item) => Math.max(bestScore, item.score),
      0
    );
    const doneKeys = new Set(
      history.map((item) => `${item.matiere}_${item.annee}`)
    );
    const remaining = indexEntries.filter(
      (entry) => !doneKeys.has(`${entry.matiere}_${entry.annee}`)
    ).length;

    return {
      attempts,
      average,
      best,
      remaining,
      done: doneKeys.size,
      total: indexEntries.length,
    };
  }, [history, indexEntries]);

  const recentHistory = useMemo(() => {
    return [...history]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  }, [history]);

  const globalLeaderboard = useMemo(() => {
    return [...history]
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      })
      .slice(0, 10);
  }, [history]);

  const categoryLeaderboard = useMemo(() => {
    return buildCategoryLeaderboard(history);
  }, [history]);

  const matieresWithHistory = useMemo(() => {
    return categoryLeaderboard.map((item) => item.matiere);
  }, [categoryLeaderboard]);

  const selectedCategoryAttempts = useMemo(() => {
    if (selectedMatiere === "global") return globalLeaderboard;

    return history
      .filter((item) => item.matiere === selectedMatiere)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      })
      .slice(0, 10);
  }, [globalLeaderboard, history, selectedMatiere]);

  const profilePicture = profile ? getProfilePicture(profile) : undefined;

  const handleLogout = () => {
    clearLocalUserProfile();
    router.push("/");
  };

  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    setAvatarError("");
    event.target.value = "";

    if (!file || !profile) return;

    if (!ALLOWED_AVATAR_MIME_TYPES[file.type]) {
      setAvatarError("Formats acceptés : JPG, PNG, WEBP ou GIF.");
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setAvatarError(`Image trop lourde. Garde une photo sous ${MAX_AVATAR_SIZE_LABEL}.`);
      return;
    }

    setAvatarUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sub", profile.sub);

      const response = await fetch("/api/users/avatar", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as {
        success: boolean;
        path?: string;
        message?: string;
      };

      if (!result.success || !result.path) {
        setAvatarError(result.message || "Échec de l'envoi de la photo.");
        return;
      }

      const nextProfile = updateLocalUserProfile({
        customPicture: result.path,
      });
      if (nextProfile) setProfile(nextProfile);
    } catch {
      setAvatarError("Échec de l'envoi de la photo.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!profile) return;

    try {
      await fetch("/api/users/avatar", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sub: profile.sub }),
      });
    } catch {
      // on retire quand même localement même si l'appel serveur échoue
    }

    const nextProfile = updateLocalUserProfile({ customPicture: undefined });
    if (nextProfile) setProfile(nextProfile);
  };

  if (!profile || loading) {
    return (
      <main className="min-h-screen bg-stone-50 px-4 py-16 text-stone-950 dark:bg-[#151512] dark:text-stone-100">
        <div className="mx-auto max-w-5xl text-sm text-stone-500">
          Chargement du compte...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-10 text-stone-950 dark:bg-[#151512] dark:text-stone-100">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-[#151512]">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                {profilePicture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profilePicture}
                    alt={profile.name}
                    className="h-20 w-20 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-emerald-50 text-2xl font-black text-emerald-800 dark:bg-[#1d1c18] dark:text-emerald-300">
                    {profile.name.charAt(0)}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-700 shadow-sm transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-stone-800 dark:bg-[#151512] dark:text-stone-100 dark:hover:bg-[#1d1c18]"
                  aria-label="Changer la photo de profil"
                >
                  <Camera className="h-4 w-4" />
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_AVATAR_ACCEPT}
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                    Tableau de bord personnel
                  </p>
                  {socialProfile?.role === "administrateur" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <ShieldCheck className="h-3 w-3" />
                      Administrateur
                    </span>
                  )}
                </div>
                <h1 className="text-3xl font-black">{profile.name}</h1>
                <p className="mt-1 text-sm text-stone-500">{profile.email}</p>

                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {socialProfile?.handle && (
                    <Link
                      href={`/profil/${socialProfile.handle}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-700 dark:text-emerald-300"
                    >
                      <UserIcon className="h-3.5 w-3.5" />
                      Voir mon profil public
                    </Link>
                  )}
                  {socialProfile && (
                    <span className="text-xs text-stone-500 dark:text-stone-400">
                      <span className="font-bold text-stone-700 dark:text-stone-200">
                        {socialProfile.followers}
                      </span>{" "}
                      abonné(e)s ·{" "}
                      <span className="font-bold text-stone-700 dark:text-stone-200">
                        {socialProfile.following}
                      </span>{" "}
                      abonnements
                    </span>
                  )}
                  <Link
                    href="/membres"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-700 dark:text-emerald-300"
                  >
                    <Users className="h-3.5 w-3.5" />
                    Découvrir les membres
                  </Link>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-xs font-bold text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-stone-800 dark:text-stone-200 dark:hover:bg-[#1d1c18]"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    {avatarUploading ? "Envoi..." : "Changer la photo"}
                  </button>

                  {profile.customPicture && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={avatarUploading}
                      className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-xs font-bold text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-stone-800 dark:text-stone-200 dark:hover:bg-[#1d1c18]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Retirer
                    </button>
                  )}
                </div>

                {avatarError && (
                  <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-300">
                    {avatarError}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-200 px-4 py-2 text-sm font-bold text-stone-700 hover:bg-stone-100 dark:border-stone-800 dark:text-stone-200 dark:hover:bg-[#1d1c18]"
            >
              <LogOut className="h-4 w-4" />
              Deconnexion
            </button>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            {
              label: "QCM faits",
              value: stats.done,
              icon: CheckCircle2,
            },
            {
              label: "Restants",
              value: stats.remaining,
              icon: Clock3,
            },
            {
              label: "Moyenne",
              value: `${stats.average.toFixed(2)}/20`,
              icon: Target,
            },
            {
              label: "Meilleur",
              value: `${stats.best.toFixed(2)}/20`,
              icon: Trophy,
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#151512]"
              >
                <Icon className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
                <div className="mt-4 text-2xl font-black">{item.value}</div>
                <div className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                  {item.label}
                </div>
              </div>
            );
          })}
        </section>

        {socialProfile && (
          <section className="mt-6 rounded-lg border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#151512]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black">Succès</h2>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    {socialProfile.achievements.length}/{ACHIEVEMENTS.length} débloqués
                  </p>
                </div>
              </div>

              {socialProfile.handle && (
                <Link
                  href={`/profil/${socialProfile.handle}`}
                  className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800 dark:text-emerald-300"
                >
                  Voir le profil public
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>

            {socialProfile.achievements.length === 0 ? (
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Termine ton premier QCM pour débloquer ton premier succès.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {socialProfile.achievements.map((achievement) => {
                  const Icon = ACHIEVEMENT_ICONS[achievement.icon];

                  return (
                    <div
                      key={achievement.key}
                      title={achievement.description}
                      className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center dark:border-emerald-900 dark:bg-emerald-950/30"
                    >
                      <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                        {Icon ? <Icon className="h-4 w-4" /> : null}
                      </div>
                      <p className="text-[11px] font-bold leading-tight">{achievement.title}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#151512]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">Derniers QCM</h2>
              <Link
                href="/#matieres"
                className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800 dark:text-emerald-300"
              >
                Continuer
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {recentHistory.length > 0 ? (
              <div className="divide-y divide-stone-100 dark:divide-stone-800">
                {recentHistory.map((item, index) => (
                  <div
                    key={`${item.matiere}-${item.annee}-${item.date}-${index}`}
                    className="flex items-center justify-between gap-4 py-4"
                  >
                    <div>
                      <div className="font-bold">
                        {item.matiere} - {item.annee}
                      </div>
                      <div className="mt-1 text-sm text-stone-500">
                        {formatDate(item.date)}
                      </div>
                    </div>
                    <div className="text-right text-lg font-black">
                      {item.score.toFixed(2)}/20
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState />
            )}
          </div>

          <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#151512]">
            <h2 className="text-xl font-black">Progression globale</h2>
            <p className="mt-2 text-sm leading-6 text-stone-500 dark:text-stone-400">
              Ces donnees restent sur cet appareil. Elles ne sont pas encore
              synchronisees avec un serveur.
            </p>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-stone-100 dark:bg-[#1d1c18]">
              <div
                className="h-full rounded-full bg-emerald-700 dark:bg-emerald-400"
                style={{
                  width:
                    stats.total > 0
                      ? `${Math.round((stats.done / stats.total) * 100)}%`
                      : "0%",
                }}
              />
            </div>

            <div className="mt-3 text-sm font-semibold text-stone-600 dark:text-stone-300">
              {stats.done}/{stats.total} epreuves vues
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#151512]">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
              <h2 className="text-xl font-black">Leaderboard matieres</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-stone-500 dark:text-stone-400">
              Classement local par moyenne, puis meilleur score.
            </p>

            {categoryLeaderboard.length > 0 ? (
              <div className="mt-5 space-y-3">
                {categoryLeaderboard.map((item, index) => (
                  <CategoryLeaderboardItem
                    key={item.matiere}
                    item={item}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <EmptyState compact />
            )}
          </div>

          <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#151512]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
                  <h2 className="text-xl font-black">Leaderboard scores</h2>
                </div>
                <p className="mt-2 text-sm leading-6 text-stone-500 dark:text-stone-400">
                  Global ou filtre par matiere, selon tes tentatives.
                </p>
              </div>

              <select
                value={selectedMatiere}
                onChange={(event) => setSelectedMatiere(event.target.value)}
                className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-bold text-stone-700 outline-none dark:border-stone-800 dark:bg-[#151512] dark:text-stone-100"
              >
                <option value="global">Global</option>
                {matieresWithHistory.map((matiere) => (
                  <option key={matiere} value={matiere}>
                    {matiere}
                  </option>
                ))}
              </select>
            </div>

            {selectedCategoryAttempts.length > 0 ? (
              <div className="mt-5 divide-y divide-stone-100 dark:divide-stone-800">
                {selectedCategoryAttempts.map((item, index) => (
                  <div
                    key={`${item.matiere}-${item.annee}-${item.date}-${index}`}
                    className="grid grid-cols-[44px_1fr_auto] items-center gap-3 py-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-50 dark:bg-[#1d1c18]">
                      <LeaderboardRankIcon index={index} />
                    </div>

                    <div className="min-w-0">
                      <div className="truncate font-bold">
                        {item.matiere} - {item.annee}
                      </div>
                      <div className="text-sm text-stone-500">
                        {formatDate(item.date)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-black">
                        {item.score.toFixed(2)}/20
                      </div>
                      <div className="text-xs font-semibold text-stone-500">
                        {getRankLabel(index)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState />
            )}
          </div>
        </section>

        <p className="mt-6 text-xs leading-5 text-stone-500 dark:text-stone-500">
          Les leaderboards sont locaux pour l&apos;instant: ils utilisent les QCM
          termines dans ce navigateur. Pour un classement public entre tous les
          etudiants, il faudra ajouter une base de donnees serveur.
        </p>
      </div>
    </main>
  );
}

function CategoryLeaderboardItem({
  item,
  index,
}: {
  item: CategoryLeaderboardRow;
  index: number;
}) {
  return (
    <div className="grid grid-cols-[36px_1fr_auto] items-center gap-3 rounded-lg border border-stone-100 bg-stone-50 p-3 dark:border-stone-800 dark:bg-[#151512]">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white dark:bg-[#151512]">
        <LeaderboardRankIcon index={index} />
      </div>

      <div className="min-w-0">
        <div className="truncate font-bold">{item.matiere}</div>
        <div className="text-xs text-stone-500">
          {item.attempts} tentative{item.attempts > 1 ? "s" : ""}
        </div>
      </div>

      <div className="text-right">
        <div className="font-black">{item.average.toFixed(2)}/20</div>
        <div className="text-xs text-stone-500">
          best {item.best.toFixed(2)}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`rounded-lg border border-dashed border-stone-200 text-center dark:border-stone-800 ${
        compact ? "mt-5 p-5" : "p-8"
      }`}
    >
      <BookOpen className="mx-auto h-8 w-8 text-stone-400" />
      <p className="mt-3 text-sm text-stone-500">
        Aucun QCM termine pour l&apos;instant.
      </p>
    </div>
  );
}
