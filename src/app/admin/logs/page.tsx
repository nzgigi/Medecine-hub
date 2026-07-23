"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, History, ShieldCheck } from "lucide-react";

interface AdminLogEntry {
  id: string;
  at: string;
  actor: {
    username: string;
    googleEmail?: string;
    googleName?: string;
    googlePicture?: string;
  };
  action: string;
  details?: string;
}

function getAdminHeaders(extraHeaders: HeadersInit = {}) {
  const token = localStorage.getItem("admin_token");

  return {
    ...extraHeaders,
    Authorization: token ? `Bearer ${token}` : "",
  };
}

function formatRelativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;

  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;

  const diffDays = Math.round(diffH / 24);
  return `il y a ${diffDays} j`;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = [
  "bg-emerald-600",
  "bg-sky-600",
  "bg-violet-600",
  "bg-amber-500",
  "bg-rose-600",
];

function getAvatarColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function AdminLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AdminLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("admin_token");

    if (!token) {
      router.push("/admin/login");
      return;
    }

    async function loadLogs() {
      try {
        const response = await fetch("/api/admin/logs", {
          headers: getAdminHeaders(),
        });

        const data = (await response.json()) as {
          success: boolean;
          logs?: AdminLogEntry[];
        };

        if (data.success) {
          setLogs(data.logs || []);
        } else {
          setError("Impossible de charger le journal");
        }
      } catch {
        setError("Impossible de charger le journal");
      } finally {
        setLoading(false);
      }
    }

    loadLogs();
  }, [router]);

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-10 text-stone-950 dark:bg-black dark:text-stone-100">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-bold text-stone-500 transition-colors hover:text-emerald-800 dark:text-stone-400 dark:hover:text-emerald-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au dashboard
        </Link>

        <div className="mb-6 mt-6 flex items-center gap-3">
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black">Journal des actions admin</h1>
            <p className="text-sm text-stone-500 dark:text-gray-400">
              Historique des actions effectuées par les administrateurs.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          {loading ? (
            <p className="p-6 text-sm text-stone-500 dark:text-gray-400">
              Chargement...
            </p>
          ) : error ? (
            <p className="p-6 text-sm font-semibold text-red-600 dark:text-red-300">
              {error}
            </p>
          ) : logs.length === 0 ? (
            <p className="p-6 text-sm text-stone-500 dark:text-gray-400">
              Aucune action enregistrée pour le moment.
            </p>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-gray-800">
              {logs.map((log) => {
                const displayName =
                  log.actor.googleName || log.actor.username;

                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-stone-50 dark:hover:bg-gray-800/60"
                  >
                    {log.actor.googlePicture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={log.actor.googlePicture}
                        alt={displayName}
                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${getAvatarColor(
                          displayName
                        )}`}
                      >
                        {getInitials(displayName)}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-bold text-stone-900 dark:text-gray-100">
                          {displayName}
                        </span>
                        {log.actor.googleEmail && (
                          <span className="text-xs text-stone-400 dark:text-gray-500">
                            {log.actor.googleEmail}
                          </span>
                        )}
                        <span className="ml-auto shrink-0 text-xs font-semibold text-stone-400 dark:text-gray-500">
                          {formatRelativeTime(log.at)}
                        </span>
                      </div>

                      <p className="mt-0.5 text-sm text-stone-700 dark:text-gray-200">
                        <ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                        {log.action}
                      </p>

                      {log.details && (
                        <p className="mt-0.5 truncate text-xs text-stone-500 dark:text-gray-400">
                          {log.details}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
