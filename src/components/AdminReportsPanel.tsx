"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Flag, RotateCcw, Trash2 } from "lucide-react";
import { useDialogs } from "@/components/DialogProvider";

interface QuestionReport {
  id: number;
  matiere: string;
  annee: number;
  questionId: number;
  questionText: string | null;
  message: string;
  userSub: string | null;
  userName: string | null;
  status: "nouveau" | "resolu";
  createdAt: string;
}

interface AdminReportsPanelProps {
  getAdminHeaders: (extraHeaders?: HeadersInit) => HeadersInit;
  onStatus: (message: string) => void;
}

export default function AdminReportsPanel({
  getAdminHeaders,
  onStatus,
}: AdminReportsPanelProps) {
  const router = useRouter();
  const { dangerConfirm } = useDialogs();

  const handleUnauthorized = () => {
    localStorage.removeItem("admin_token");
    router.push("/admin/login");
  };

  const [reports, setReports] = useState<QuestionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"nouveau" | "resolu" | "tous">("nouveau");

  const loadReports = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/question-reports", {
        headers: getAdminHeaders(),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const result = (await response.json()) as {
        success: boolean;
        reports?: QuestionReport[];
      };

      if (result.success) setReports(result.reports || []);
    } catch (error) {
      console.error("Erreur chargement des signalements:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runAction = async (id: number, action: "resolve" | "reopen" | "delete") => {
    const response = await fetch("/api/admin/question-reports", {
      method: "POST",
      headers: getAdminHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ action, id }),
    });

    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    const result = (await response.json()) as { success: boolean };

    if (result.success) {
      await loadReports();
      onStatus(
        action === "resolve"
          ? "Signalement marqué résolu"
          : action === "reopen"
          ? "Signalement rouvert"
          : "Signalement supprimé"
      );
    }
  };

  const handleDelete = async (report: QuestionReport) => {
    const confirmed = await dangerConfirm(
      `Tu es sur le point de supprimer definitivement ce signalement (${report.matiere} ${report.annee}, Q${report.questionId}).`,
      { detail: report.message.slice(0, 140) }
    );

    if (!confirmed) return;
    await runAction(report.id, "delete");
  };

  const visibleReports = reports.filter((report) =>
    filter === "tous" ? true : report.status === filter
  );

  const newCount = reports.filter((report) => report.status === "nouveau").length;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#1d1c18]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 p-2 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <Flag className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black">Signalements d&apos;erreurs</h2>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Erreurs remontées par les étudiants sur des questions de QCM.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(["nouveau", "resolu", "tous"] as const).map((value) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  filter === value
                    ? "bg-emerald-700 text-white"
                    : "border border-stone-200 text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                }`}
              >
                {value === "nouveau"
                  ? `Nouveaux${newCount > 0 ? ` (${newCount})` : ""}`
                  : value === "resolu"
                  ? "Résolus"
                  : "Tous"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">Chargement...</p>
        ) : visibleReports.length === 0 ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
            Aucun signalement dans cette catégorie.
          </div>
        ) : (
          <div className="space-y-3">
            {visibleReports.map((report) => (
              <div
                key={report.id}
                className={`rounded-lg border p-4 ${
                  report.status === "nouveau"
                    ? "border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/20"
                    : "border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-[#151512]"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-stone-500 dark:text-stone-400">
                      <span className="rounded-md bg-stone-200 px-2 py-0.5 text-stone-700 dark:bg-stone-800 dark:text-stone-200">
                        {report.matiere} {report.annee}
                      </span>
                      <span>Question {report.questionId}</span>
                      <span>·</span>
                      <span>{new Date(report.createdAt).toLocaleString("fr-FR")}</span>
                      {report.userName && (
                        <>
                          <span>·</span>
                          <span>{report.userName}</span>
                        </>
                      )}
                    </div>

                    {report.questionText && (
                      <p className="mt-2 line-clamp-2 text-xs italic text-stone-500 dark:text-stone-400">
                        {report.questionText}
                      </p>
                    )}

                    <p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-stone-800 dark:text-stone-100">
                      {report.message}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {report.status === "nouveau" ? (
                      <button
                        onClick={() => runAction(report.id, "resolve")}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-600"
                        title="Marquer comme résolu"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Résolu
                      </button>
                    ) : (
                      <button
                        onClick={() => runAction(report.id, "reopen")}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-bold text-stone-600 transition hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                        title="Rouvrir"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Rouvrir
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(report)}
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      title="Supprimer le signalement"
                      aria-label="Supprimer le signalement"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <p>
            Un signalement ne modifie pas automatiquement le QCM : corrige la question
            depuis l&apos;onglet Épreuves, puis marque le signalement comme résolu ici.
          </p>
        </div>
      </div>
    </div>
  );
}
