"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dumbbell, Lock, Pencil, Play, Search, Target, Trash2 } from "lucide-react";
import { useDialogs } from "@/components/DialogProvider";
import AdminAnnalesImport from "@/components/AdminAnnalesImport";
import { matchesSearch, PRIVATE_NAME_MAX_LENGTH } from "@/lib/exam/privateNaming";

interface PrivateQcmSummary {
  slug: string;
  annee: number;
  matiere: string;
  total_questions: number;
  folders: number;
}

interface AdminPrivateQcmPanelProps {
  getAdminHeaders: (extraHeaders?: HeadersInit) => HeadersInit;
  onStatus: (message: string) => void;
}

const ENDPOINT = "/api/admin/private-qcm";

export default function AdminPrivateQcmPanel({ getAdminHeaders, onStatus }: AdminPrivateQcmPanelProps) {
  const router = useRouter();
  const { alert: showAlert, prompt: showPrompt, dangerConfirm } = useDialogs();
  const [qcms, setQcms] = useState<PrivateQcmSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch(ENDPOINT, { headers: getAdminHeaders() });
      if (response.status === 401) {
        localStorage.removeItem("admin_token");
        router.push("/admin/login");
        return;
      }
      const result = (await response.json()) as { success: boolean; qcms?: PrivateQcmSummary[] };
      if (result.success) setQcms(result.qcms ?? []);
    } catch (error) {
      console.error("Erreur chargement QCM prives:", error);
    } finally {
      setLoading(false);
    }
  }, [getAdminHeaders, router]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remove = async (qcm: PrivateQcmSummary) => {
    const confirmed = await dangerConfirm(
      `Tu es sur le point de supprimer definitivement ce QCM prive : ${qcm.matiere} — ${qcm.annee}.`
    );
    if (!confirmed) return;

    const response = await fetch(ENDPOINT, {
      method: "DELETE",
      headers: getAdminHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ slug: qcm.slug, annee: qcm.annee }),
    });
    const result = (await response.json()) as { success: boolean; message?: string };
    if (!result.success) {
      await showAlert(result.message || "Echec de la suppression.");
      return;
    }
    await load();
    onStatus("QCM prive supprime");
  };

  const rename = async (qcm: PrivateQcmSummary) => {
    const years = qcms.filter((item) => item.slug === qcm.slug).length;
    const input = await showPrompt(
      years > 1 ? `Nouveau nom (appliqué aux ${years} années de cette matière).` : "Nouveau nom.",
      { title: "Renommer", defaultValue: qcm.matiere, confirmLabel: "Enregistrer" }
    );
    const matiere = input?.trim();
    if (!matiere || matiere === qcm.matiere) return;
    if (matiere.length > PRIVATE_NAME_MAX_LENGTH) {
      await showAlert(`Nom trop long (${PRIVATE_NAME_MAX_LENGTH} caractères maximum).`);
      return;
    }

    try {
      const response = await fetch(ENDPOINT, {
        method: "PATCH",
        headers: getAdminHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ slug: qcm.slug, matiere }),
      });
      const result = (await response.json()) as { success: boolean; message?: string };
      if (!result.success) {
        await showAlert(result.message || "Echec du renommage.");
        return;
      }
      await load();
      onStatus("QCM prive renomme");
    } catch {
      await showAlert("Echec du renommage.");
    }
  };

  const visibleQcms = qcms.filter((qcm) => matchesSearch(qcm, search));

  const subjects = [...new Map(qcms.map((q) => [q.slug, { slug: q.slug, matiere: q.matiere }])).values()];

  return (
    <div className="space-y-6">
      <AdminAnnalesImport
        existingSubjects={subjects}
        existingExams={qcms.map((q) => ({ slug: q.slug, annee: q.annee }))}
        getAdminHeaders={getAdminHeaders}
        onStatus={onStatus}
        onImported={load}
        endpoint={ENDPOINT}
        title="Importer un QCM prive (JSON)"
        description="Visible uniquement par les administrateurs : jamais affiche sur le site, ni dans les classements. Telecharge le modele, donne-le a Claude, importe le resultat."
        templateName="modele-qcm-prive.json"
      />

      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#1d1c18]">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Lock className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-black">Mes QCM prives</h2>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 p-3 dark:border-stone-800">
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">
            Suivi de tes erreurs sur les QCM prives (reserve a l&apos;administrateur).
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/prive/entrainement"
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 px-3 py-1.5 text-sm font-bold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
            >
              <Dumbbell className="h-4 w-4" />
              S&apos;entraîner (tout)
            </Link>
            <Link
              href="/admin/prive/erreurs"
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-amber-700"
            >
              <Target className="h-4 w-4" />
              Mes erreurs
            </Link>
          </div>
        </div>

        {qcms.length > 0 && (
          <div className="mb-2">
            <label className="relative block">
              <span className="sr-only">Rechercher un QCM privé</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher par numéro d'item, nom ou année..."
                className="w-full rounded-lg border border-stone-200 bg-white py-2.5 pl-10 pr-3 text-sm font-semibold text-stone-950 outline-none focus:border-emerald-600 dark:border-stone-800 dark:bg-[#151512] dark:text-stone-100"
              />
            </label>
            {search.trim() && (
              <p className="mt-2 text-xs text-stone-500 dark:text-stone-400" aria-live="polite">
                {visibleQcms.length} résultat{visibleQcms.length > 1 ? "s" : ""} sur {qcms.length}
              </p>
            )}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">Chargement...</p>
        ) : qcms.length === 0 ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">Aucun QCM prive pour le moment.</p>
        ) : (
          <ul className="divide-y divide-stone-100 dark:divide-stone-800">
            {visibleQcms.map((qcm) => (
              <li key={`${qcm.slug}-${qcm.annee}`} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-stone-900 dark:text-stone-100">
                    {qcm.matiere} — {qcm.annee}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {qcm.folders} dossier{qcm.folders > 1 ? "s" : ""}, {qcm.total_questions} question
                    {qcm.total_questions > 1 ? "s" : ""}
                  </p>
                </div>
                <Link
                  href={`/admin/prive/${qcm.slug}/${qcm.annee}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-emerald-700"
                >
                  <Play className="h-4 w-4" />
                  Passer
                </Link>
                <Link
                  href={`/admin/prive/entrainement?slug=${encodeURIComponent(qcm.slug)}&annee=${qcm.annee}&matiere=${encodeURIComponent(qcm.slug)}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 px-3 py-1.5 text-sm font-bold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                >
                  <Dumbbell className="h-4 w-4" />
                  S&apos;entraîner
                </Link>
                <button
                  type="button"
                  onClick={() => rename(qcm)}
                  aria-label={`Renommer ${qcm.matiere}`}
                  title="Renommer"
                  className="rounded-lg border border-stone-200 p-2 text-stone-600 hover:bg-stone-100 dark:border-stone-800 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(qcm)}
                  aria-label="Supprimer"
                  className="rounded-lg border border-stone-200 p-2 text-red-600 hover:bg-red-50 dark:border-stone-800 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
