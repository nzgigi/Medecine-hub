"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Share2, X } from "lucide-react";

interface ShareScoreButtonProps {
  slug: string;
  matiere: string;
  annee: number;
  score: number;
}

type Status = "idle" | "loading" | "copied" | "error";

const FLASH_DURATION_MS = 1800;

export default function ShareScoreButton({
  slug,
  matiere,
  annee,
  score,
}: ShareScoreButtonProps) {
  const [status, setStatus] = useState<Status>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const flash = (next: Status) => {
    setStatus(next);
    timeoutRef.current = setTimeout(() => setStatus("idle"), FLASH_DURATION_MS);
  };

  const handleClick = async () => {
    if (status !== "idle") return;

    setStatus("loading");

    let url: string;

    try {
      const response = await fetch("/api/qcm/share-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, matiere, annee, score }),
      });

      const result = (await response.json()) as { success: boolean; url?: string };

      if (!result.success || !result.url) {
        flash("error");
        return;
      }

      url = result.url;
    } catch {
      flash("error");
      return;
    }

    const text = `J'ai obtenu ${score.toFixed(2)}/20 en ${matiere} (${annee}) sur Medecine Hub 💪\nTeste-toi aussi :`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "Mon score sur Medecine Hub", text, url });
      } catch {
        // Partage annulé par l'utilisateur : pas une erreur.
      }
      setStatus("idle");
      return;
    }

    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      flash("copied");
    } catch {
      flash("error");
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={status === "loading"}
      className={`inline-flex min-w-[190px] items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold transition-all duration-200 ease-out disabled:cursor-wait ${
        status === "copied"
          ? "scale-105 border-emerald-500 bg-emerald-600 text-white"
          : status === "error"
          ? "scale-105 border-red-500 bg-red-600 text-white"
          : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
      }`}
    >
      {status === "copied" ? (
        <>
          <Check className="h-4 w-4" />
          Copié !
        </>
      ) : status === "error" ? (
        <>
          <X className="h-4 w-4" />
          Échec, réessaie
        </>
      ) : (
        <>
          <Share2 className={`h-4 w-4 ${status === "loading" ? "animate-pulse" : ""}`} />
          Partager mon score
        </>
      )}
    </button>
  );
}
