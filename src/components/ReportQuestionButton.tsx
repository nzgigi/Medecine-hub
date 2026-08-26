"use client";

import { useState } from "react";
import { CheckCircle2, Flag, Loader2, X } from "lucide-react";
import { getLocalUserProfile } from "@/lib/userProfile";

interface ReportQuestionButtonProps {
  matiere: string;
  annee: number;
  questionId: number;
  questionText?: string;
  className?: string;
}

export default function ReportQuestionButton({
  matiere,
  annee,
  questionId,
  questionText,
  className,
}: ReportQuestionButtonProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (submitting) return;
    setOpen(false);
    setError(null);
  };

  const submit = async () => {
    if (message.trim().length < 5) {
      setError("Décris un peu plus le problème (5 caractères minimum).");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const profile = getLocalUserProfile();

      const response = await fetch("/api/qcm/report-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matiere,
          annee,
          questionId,
          questionText,
          message: message.trim(),
          sub: profile?.sub,
        }),
      });

      const result = (await response.json()) as { success: boolean; message?: string };

      if (!result.success) {
        setError(result.message || "Impossible d'envoyer le signalement.");
        return;
      }

      setSubmitted(true);
      setMessage("");
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
      }, 1600);
    } catch {
      setError("Impossible d'envoyer le signalement, réessaie plus tard.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ||
          "inline-flex items-center gap-1.5 text-xs font-semibold text-stone-400 transition-colors hover:text-amber-600 dark:text-stone-500 dark:hover:text-amber-400"
        }
        title="Signaler un problème sur cette question"
      >
        <Flag className="h-3.5 w-3.5" />
        Signaler une erreur
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl dark:border-stone-800 dark:bg-[#1a1917]"
            onClick={(event) => event.stopPropagation()}
          >
            {submitted ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                <p className="text-sm font-bold text-stone-800 dark:text-stone-100">
                  Merci ! On va regarder ça.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-amber-50 p-2 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                      <Flag className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-stone-950 dark:text-white">
                        Signaler une erreur
                      </p>
                      <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                        Question {questionId} · {matiere} {annee}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Fermer"
                    className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <textarea
                  autoFocus
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Décris le problème : mauvaise réponse, énoncé ambigu, faute de frappe..."
                  rows={4}
                  maxLength={1000}
                  className="mt-4 w-full resize-none rounded-lg border border-stone-300 bg-white p-3 text-sm text-stone-950 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100 dark:border-stone-700 dark:bg-[#151512] dark:text-stone-100 dark:focus:ring-amber-950/30"
                />

                {error && (
                  <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">
                    {error}
                  </p>
                )}

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={close}
                    disabled={submitting}
                    className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-bold text-stone-700 transition hover:bg-stone-100 disabled:opacity-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={submitting || message.trim().length < 5}
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Envoyer
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
