"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const ADMIN_TOKEN_KEY = "admin_token";
const CHECK_INTERVAL_MS = 30_000;
const WARNING_THRESHOLD_MS = 10 * 60 * 1000;

function base64UrlDecode(value: string): string {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");

  return atob(padded);
}

function decodeTokenExpiry(token: string): number | null {
  try {
    const [encodedPayload] = token.split(".");
    if (!encodedPayload) return null;

    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "expirée";

  const totalMinutes = Math.ceil(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) return `${hours}h${minutes.toString().padStart(2, "0")}`;
  return `${minutes} min`;
}

/**
 * Surveille l'expiration du token admin (duree de vie 8h) : redirige vers
 * /admin/login des qu'il expire au lieu de laisser l'utilisateur decouvrir
 * la panne au prochain appel API, et donne un libelle a afficher pour
 * qu'il sache s'il doit se reconnecter avant de commencer une modification.
 */
export function useAdminSessionExpiry() {
  const router = useRouter();
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => {
      setNow(Date.now());

      const token = localStorage.getItem(ADMIN_TOKEN_KEY);
      const exp = token ? decodeTokenExpiry(token) : null;

      if (token && exp && exp <= Date.now()) {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        router.push("/admin/login");
        return;
      }

      setExpiresAt(exp);
    };

    tick();
    const interval = setInterval(tick, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [router]);

  if (expiresAt === null) {
    return { remainingLabel: null, isExpiringSoon: false };
  }

  const remainingMs = expiresAt - now;

  return {
    remainingLabel: formatRemaining(remainingMs),
    isExpiringSoon: remainingMs <= WARNING_THRESHOLD_MS,
  };
}
