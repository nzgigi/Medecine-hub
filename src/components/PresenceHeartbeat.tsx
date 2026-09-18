"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getLocalUserProfile, USER_PROFILE_UPDATED_EVENT } from "@/lib/userProfile";

const HEARTBEAT_INTERVAL_MS = 45_000;
const VISITOR_ID_STORAGE_KEY = "medecine_hub_visitor_id";
const ENDPOINT = "/api/presence/heartbeat";

let fallbackVisitorId: string | null = null;

function generateVisitorId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Identifiant aléatoire propre au navigateur (deux onglets = un seul connecté). Aucune donnée personnelle. */
function getVisitorId() {
  try {
    const stored = localStorage.getItem(VISITOR_ID_STORAGE_KEY);
    if (stored) return stored;

    const created = generateVisitorId();
    localStorage.setItem(VISITOR_ID_STORAGE_KEY, created);
    return created;
  } catch {
    fallbackVisitorId ??= generateVisitorId();
    return fallbackVisitorId;
  }
}

export default function PresenceHeartbeat() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;

    const visitorId = getVisitorId();

    const beat = () => {
      if (document.visibilityState !== "visible") return;

      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorId,
          sub: getLocalUserProfile()?.sub,
          path: pathname,
        }),
        keepalive: true,
      }).catch(() => {});
    };

    const leave = () => {
      navigator.sendBeacon?.(
        ENDPOINT,
        new Blob([JSON.stringify({ visitorId, leaving: true })], {
          type: "application/json",
        })
      );
    };

    beat();

    const interval = setInterval(beat, HEARTBEAT_INTERVAL_MS);

    document.addEventListener("visibilitychange", beat);
    window.addEventListener(USER_PROFILE_UPDATED_EVENT, beat);
    window.addEventListener("pagehide", leave);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", beat);
      window.removeEventListener(USER_PROFILE_UPDATED_EVENT, beat);
      window.removeEventListener("pagehide", leave);
    };
  }, [pathname]);

  return null;
}
