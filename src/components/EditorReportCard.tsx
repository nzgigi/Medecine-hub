"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check, CheckCircle2, Flag } from "lucide-react";

export interface EditorReport {
  id: number;
  questionId: number;
  message: string;
  userName: string | null;
  status: "nouveau" | "resolu";
  createdAt: string;
}

type GetAdminHeaders = (extraHeaders?: HeadersInit) => HeadersInit;

/** Charge le signalement désigné par `?signalement=<id>`, s'il vise bien l'épreuve ouverte. */
export function useEditorReport(getAdminHeaders: GetAdminHeaders) {
  const [report, setReport] = useState<EditorReport | null>(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get("signalement"));
    if (!id) return;

    let cancelled = false;
    const examPath = window.location.pathname;

    fetch("/api/admin/question-reports", { headers: getAdminHeaders() })
      .then((response) => response.json())
      .then(
        (result: {
          success: boolean;
          reports?: (EditorReport & { target: { slug: string; annee: number } | null })[];
        }) => {
          const found = result.reports?.find((item) => item.id === id);
          if (cancelled || !found?.target) return;

          if (examPath === `/admin/edit/${found.target.slug}/${found.target.annee}`) {
            setReport(found);
          }
        }
      )
      .catch(() => {
        // L'éditeur reste utilisable sans l'encart.
      });

    return () => {
      cancelled = true;
    };
  }, [getAdminHeaders]);

  const resolveReport = async () => {
    if (!report) return false;

    setResolving(true);

    try {
      const response = await fetch("/api/admin/question-reports", {
        method: "POST",
        headers: getAdminHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ action: "resolve", id: report.id }),
      });
      const result = (await response.json()) as { success: boolean };
      if (result.success) setReport({ ...report, status: "resolu" });

      return result.success;
    } catch {
      return false;
    } finally {
      setResolving(false);
    }
  };

  return { report, resolving, resolveReport };
}

export default function EditorReportCard({
  report,
  questionNumber,
  busy,
  onShowQuestion,
  onSaveAndResolve,
  onBack,
}: {
  report: EditorReport;
  /** Position de la question dans son dossier, `null` si elle n'existe plus. */
  questionNumber: number | null;
  busy: boolean;
  onShowQuestion: () => void;
  onSaveAndResolve: () => void;
  onBack: () => void;
}) {
  return (
    // Fixé à l'écran pour rester visible à côté de la question pendant la correction.
    <section
      aria-label="Signalement en cours de correction"
      className="fixed inset-x-2 bottom-2 z-30 max-h-[70vh] overflow-y-auto rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 shadow-2xl dark:border-amber-800 dark:bg-[#2a2213] lg:inset-x-auto lg:bottom-4 lg:left-4 lg:w-80"
    >
      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
        <Flag className="h-4 w-4" />
        <h2 className="font-extrabold">Signalement #{report.id}</h2>
      </div>

      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
        {report.userName ?? "Anonyme"} · {new Date(report.createdAt).toLocaleDateString("fr-FR")}
      </p>

      <p className="mt-3 max-h-20 overflow-y-auto lg:max-h-48 whitespace-pre-wrap break-words text-sm font-semibold text-stone-900 dark:text-stone-100">
        {report.message}
      </p>

      {questionNumber ? (
        <button
          type="button"
          onClick={onShowQuestion}
          className="mt-3 text-sm font-bold text-amber-800 underline underline-offset-2 dark:text-amber-300"
        >
          Voir la question (Q{questionNumber} du dossier)
        </button>
      ) : (
        <p className="mt-3 text-sm font-bold text-red-600 dark:text-red-400">
          La question signalée n&apos;est plus dans cette épreuve.
        </p>
      )}

      {report.status === "resolu" ? (
        <p className="mt-4 flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          Signalement résolu
        </p>
      ) : (
        <button
          type="button"
          onClick={onSaveAndResolve}
          disabled={busy}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          {busy ? "En cours..." : "Enregistrer et résoudre"}
        </button>
      )}

      <button
        type="button"
        onClick={onBack}
        className="mt-3 flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Retour aux signalements
      </button>
    </section>
  );
}
