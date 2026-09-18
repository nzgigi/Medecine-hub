"use client";

import { useSyncExternalStore } from "react";

const POLL_INTERVAL_MS = 30_000;

// Un seul sondage partagé par tous les points de la page (liste de membres
// comprise), au lieu d'un fetch par avatar.
let onlineHandles: ReadonlySet<string> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

async function refreshOnlineHandles() {
  try {
    const response = await fetch("/api/presence/online", { cache: "no-store" });
    const result = (await response.json()) as { success: boolean; handles?: string[] };

    if (!result.success || !result.handles) return;

    onlineHandles = new Set(result.handles);
    listeners.forEach((listener) => listener());
  } catch {
    // On garde le dernier état connu.
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  if (listeners.size === 1) {
    refreshOnlineHandles();
    pollTimer = setInterval(() => {
      if (document.visibilityState === "visible") refreshOnlineHandles();
    }, POLL_INTERVAL_MS);
  }

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0 && pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };
}

const getSnapshot = () => onlineHandles;
const getServerSnapshot = () => null;

interface OnlineDotProps {
  handle: string;
  /** État calculé côté serveur, affiché jusqu'au premier sondage. */
  initialOnline?: boolean;
  /** Couleur de la bordure : doit correspondre au fond de la carte. */
  borderClassName?: string;
  sizeClassName?: string;
  /** Positionnement ; le parent de l'avatar doit être `relative`. */
  positionClassName?: string;
}

export default function OnlineDot({
  handle,
  initialOnline = false,
  borderClassName = "border-white dark:border-[#1d1c18]",
  sizeClassName = "h-3.5 w-3.5",
  positionClassName = "absolute -bottom-1 -right-1",
}: OnlineDotProps) {
  const handles = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const online = handles ? handles.has(handle) : initialOnline;
  const label = online ? "En ligne" : "Hors ligne";

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`${positionClassName} ${sizeClassName} rounded-full border-2 ${borderClassName} ${
        online ? "bg-green-500" : "bg-stone-400 dark:bg-stone-500"
      }`}
    />
  );
}
