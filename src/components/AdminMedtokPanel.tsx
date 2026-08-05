"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Edit, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useDialogs } from "@/components/DialogProvider";
import type { MedtokCardEntry } from "@/app/api/admin/medtok-cards/route";

interface SubjectOption {
  slug: string;
  matiere: string;
}

interface AdminMedtokPanelProps {
  existingSubjects: SubjectOption[];
  getAdminHeaders: (extraHeaders?: HeadersInit) => HeadersInit;
  onStatus: (message: string) => void;
}

const emptyForm = {
  slug: "",
  contexte: "",
  question: "",
  proposition: "",
  isTrue: true,
  correctionExplanation: "",
};

export default function AdminMedtokPanel({
  existingSubjects,
  getAdminHeaders,
  onStatus,
}: AdminMedtokPanelProps) {
  const router = useRouter();
  const { alert: showAlert, dangerConfirm } = useDialogs();

  const handleUnauthorized = () => {
    localStorage.removeItem("admin_token");
    router.push("/admin/login");
  };

  const [cards, setCards] = useState<MedtokCardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!form.slug && existingSubjects.length > 0) {
      setForm((current) => ({ ...current, slug: existingSubjects[0].slug }));
    }
  }, [existingSubjects, form.slug]);

  const loadCards = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/medtok-cards", {
        headers: getAdminHeaders(),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const result = (await response.json()) as {
        success: boolean;
        cards?: MedtokCardEntry[];
      };

      if (result.success) setCards(result.cards || []);
    } catch (error) {
      console.error("Erreur chargement cartes MedTok:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm({ ...emptyForm, slug: existingSubjects[0]?.slug || "" });
  };

  const startEdit = (card: MedtokCardEntry) => {
    setEditingId(card.id);
    setForm({
      slug: card.slug,
      contexte: card.contexte || "",
      question: card.question,
      proposition: card.proposition,
      isTrue: card.isTrue,
      correctionExplanation: card.correctionExplanation || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    const subject = existingSubjects.find((item) => item.slug === form.slug);

    if (!subject || !form.question.trim() || !form.proposition.trim()) return;

    setSaving(true);

    try {
      const response = await fetch("/api/admin/medtok-cards", {
        method: "POST",
        headers: getAdminHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          action: editingId ? "update" : "create",
          id: editingId || undefined,
          matiere: subject.matiere,
          slug: subject.slug,
          contexte: form.contexte,
          question: form.question,
          proposition: form.proposition,
          isTrue: form.isTrue,
          correctionExplanation: form.correctionExplanation,
        }),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const result = (await response.json()) as { success: boolean; message?: string };

      if (!result.success) {
        await showAlert(result.message || "Échec de l'enregistrement de la carte.");
        return;
      }

      resetForm();
      await loadCards();
      onStatus(editingId ? "Carte MedTok modifiee" : "Carte MedTok ajoutee");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (card: MedtokCardEntry) => {
    const confirmed = await dangerConfirm(
      `Tu es sur le point de supprimer definitivement cette carte MedTok (${card.matiere}).`,
      { detail: card.question.slice(0, 140) }
    );

    if (!confirmed) return;

    const response = await fetch("/api/admin/medtok-cards", {
      method: "POST",
      headers: getAdminHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ action: "delete", id: card.id }),
    });

    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    const result = (await response.json()) as { success: boolean; message?: string };
    if (result.success) {
      await loadCards();
      onStatus("Carte MedTok supprimee");
    } else {
      await showAlert(result.message || "Échec de la suppression de la carte.");
    }
  };

  const inputClass =
    "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:border-stone-700 dark:bg-[#151512] dark:text-stone-100";

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#1d1c18]">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-black">
              {editingId ? "Modifier la carte" : "Ajouter une carte MedTok"}
            </h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Propositions vrai/faux affichees dans le mode MedTok, ecrites par vous.
            </p>
          </div>
        </div>

        {existingSubjects.length === 0 ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Cree d&apos;abord une matiere dans l&apos;onglet Epreuves.
          </p>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                Matiere
              </label>
              <select
                value={form.slug}
                onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                className={inputClass}
              >
                {existingSubjects.map((subject) => (
                  <option key={subject.slug} value={subject.slug}>
                    {subject.matiere}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                Contexte (optionnel)
              </label>
              <textarea
                value={form.contexte}
                onChange={(event) => setForm((current) => ({ ...current, contexte: event.target.value }))}
                rows={2}
                placeholder="Vignette clinique partagee par plusieurs propositions, si besoin"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                Question
              </label>
              <textarea
                value={form.question}
                onChange={(event) => setForm((current) => ({ ...current, question: event.target.value }))}
                rows={2}
                placeholder="Ex : Quelle(s) proposition(s) est(sont) exacte(s) ?"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                Proposition
              </label>
              <textarea
                value={form.proposition}
                onChange={(event) =>
                  setForm((current) => ({ ...current, proposition: event.target.value }))
                }
                rows={2}
                placeholder="La proposition que l'utilisateur doit juger vraie ou fausse"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                Cette proposition est...
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, isTrue: true }))}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 py-2 text-sm font-bold transition ${
                    form.isTrue
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "border-stone-200 text-stone-500 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
                  }`}
                >
                  <Check className="h-4 w-4" />
                  Vraie
                </button>
                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, isTrue: false }))}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 py-2 text-sm font-bold transition ${
                    !form.isTrue
                      ? "border-red-500 bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-300"
                      : "border-stone-200 text-stone-500 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
                  }`}
                >
                  <X className="h-4 w-4" />
                  Fausse
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                Explication (optionnel)
              </label>
              <textarea
                value={form.correctionExplanation}
                onChange={(event) =>
                  setForm((current) => ({ ...current, correctionExplanation: event.target.value }))
                }
                rows={2}
                placeholder="Affichee apres la reponse de l'utilisateur"
                className={inputClass}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSubmit}
                disabled={saving || !form.question.trim() || !form.proposition.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                {saving ? "Enregistrement..." : editingId ? "Enregistrer" : "Ajouter la carte"}
              </button>
              {editingId && (
                <button
                  onClick={resetForm}
                  className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-bold text-stone-700 hover:bg-stone-100 dark:border-stone-800 dark:text-stone-200 dark:hover:bg-stone-800"
                >
                  Annuler
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-[#1d1c18]">
        <div className="border-b border-stone-200 p-5 dark:border-stone-800">
          <h2 className="text-xl font-black">Cartes existantes</h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            {cards.length} carte{cards.length > 1 ? "s" : ""} au total.
          </p>
        </div>

        <div className="divide-y divide-stone-100 dark:divide-stone-800">
          {loading && (
            <p className="p-5 text-sm text-stone-500 dark:text-stone-400">Chargement...</p>
          )}

          {!loading && cards.length === 0 && (
            <p className="p-5 text-sm text-stone-500 dark:text-stone-400">
              Aucune carte pour le moment.
            </p>
          )}

          {cards.map((card) => (
            <div key={card.id} className="flex items-start gap-3 p-4">
              <span
                className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-black ${
                  card.isTrue
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-300"
                }`}
              >
                {card.isTrue ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                {card.isTrue ? "Vraie" : "Fausse"}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wide text-stone-400 dark:text-stone-500">
                  {card.matiere}
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-stone-800 dark:text-stone-100">
                  {card.question}
                </p>
                <p className="truncate text-sm text-stone-500 dark:text-stone-400">
                  {card.proposition}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => startEdit(card)}
                  className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
                  title="Modifier"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(card)}
                  className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
