"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle2, Sparkles, Trophy, UserPlus, type LucideIcon } from "lucide-react";
import type { AppNotification, NotificationType } from "@/lib/server/notifications";

const REFRESH_MS = 60_000;

const ICONS: Record<NotificationType, LucideIcon> = {
  mise_a_jour: Sparkles,
  signalement: CheckCircle2,
  abonne: UserPlus,
  succes: Trophy,
};

/** Chargé une seule fois par la barre de navigation, partagé entre ses versions bureau et mobile. */
export function useNotifications(enabled: boolean, pathname: string | null) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const refresh = async () => {
      if (document.visibilityState !== "visible") return;

      try {
        const response = await fetch("/api/notifications", { cache: "no-store" });
        const result = (await response.json()) as {
          success: boolean;
          notifications?: AppNotification[];
        };
        if (!cancelled) setNotifications(result.success ? result.notifications ?? [] : []);
      } catch {
        // réseau indisponible : on garde la liste précédente
      }
    };

    refresh();
    const timer = window.setInterval(refresh, REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [enabled, pathname]);

  const markAllRead = useCallback(() => {
    const keys = notifications.filter((item) => !item.read).map((item) => item.key);
    if (keys.length === 0) return;

    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keys }),
    }).catch(() => {
      // en cas d'échec, elles réapparaîtront non lues au prochain rafraîchissement
    });
  }, [notifications]);

  return { notifications: enabled ? notifications : [], markAllRead };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(value));
}

export default function NotificationBell({
  notifications,
  onOpen,
  className = "",
}: {
  notifications: AppNotification[];
  onOpen: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  // Les non lues restent mises en évidence tant que le panneau reste ouvert.
  const [freshKeys, setFreshKeys] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement | null>(null);
  const unreadCount = notifications.filter((item) => !item.read).length;

  useEffect(() => {
    if (!open) return;

    const handlePointer = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const toggle = () => {
    if (!open) {
      setFreshKeys(new Set(notifications.filter((item) => !item.read).map((item) => item.key)));
      onOpen();
    }
    setOpen(!open);
  };

  return (
    // Sur téléphone, le panneau prend la largeur de la barre ; au-delà, il s'ancre sous la cloche.
    <div ref={containerRef} className={`sm:relative ${className}`}>
      <button
        type="button"
        onClick={toggle}
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} non lues)` : "Notifications"}
        aria-expanded={open}
        title="Notifications"
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-700 transition-colors hover:bg-stone-100 dark:border-stone-800 dark:bg-[#151512] dark:text-stone-200 dark:hover:bg-[#1d1c18]"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute inset-x-2 top-full z-50 mt-2 overflow-hidden rounded-xl border border-stone-200 bg-white text-left shadow-2xl dark:border-stone-800 dark:bg-[#1a1917] sm:left-auto sm:right-0 sm:w-80">
          <p className="border-b border-stone-200 px-4 py-3 text-sm font-black text-stone-950 dark:border-stone-800 dark:text-white">
            Notifications
          </p>

          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-stone-500 dark:text-stone-400">
              Rien de nouveau pour le moment.
            </p>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-stone-100 overflow-y-auto dark:divide-stone-800">
              {notifications.map((item) => {
                const Icon = ICONS[item.type];
                const fresh = freshKeys.has(item.key);
                const content = (
                  <div className="flex items-start gap-3 px-4 py-3">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-stone-950 dark:text-stone-100">{item.title}</p>
                      <p className="mt-0.5 text-xs leading-5 text-stone-600 dark:text-stone-300">{item.message}</p>
                      <p className="mt-0.5 text-[11px] text-stone-400 dark:text-stone-500">{formatDate(item.date)}</p>
                    </div>
                    {fresh && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}
                  </div>
                );

                return (
                  <li key={item.key} className={fresh ? "bg-emerald-50/60 dark:bg-emerald-950/20" : ""}>
                    {item.href ? (
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="block transition-colors hover:bg-stone-100 dark:hover:bg-[#24231e]"
                      >
                        {content}
                      </Link>
                    ) : (
                      content
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
