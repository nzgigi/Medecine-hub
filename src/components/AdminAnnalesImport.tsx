"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Download, FileJson, Upload } from "lucide-react";
import { useDialogs } from "@/components/DialogProvider";
import {
  buildAnnalesTemplate,
  extractAnnales,
  validateAnnales,
  type AnnaleImportResult,
  type AnnaleSubject,
} from "@/lib/annalesImport";

interface ImportPreview extends AnnaleImportResult {
  fileName: string;
  raw: unknown[];
}

interface AdminAnnalesImportProps {
  existingSubjects: AnnaleSubject[];
  existingExams: { slug: string; annee: number }[];
  getAdminHeaders: (extraHeaders?: HeadersInit) => HeadersInit;
  onStatus: (message: string) => void;
  onImported: () => void | Promise<void>;
  /** Route d'import (publique par defaut). */
  endpoint?: string;
  title?: string;
  description?: string;
  /** Nom du fichier modele telecharge. */
  templateName?: string;
}

export default function AdminAnnalesImport({
  existingSubjects,
  existingExams,
  getAdminHeaders,
  onStatus,
  onImported,
  endpoint = "/api/admin/import-annales",
  title = "Importer des annales (JSON)",
  description = "Telecharge le modele, donne-le a Claude avec ton cours ou tes QCM, puis importe le fichier obtenu.",
  templateName = "modele-annales.json",
}: AdminAnnalesImportProps) {
  const router = useRouter();
  const { alert: showAlert } = useDialogs();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [importing, setImporting] = useState(false);

  const downloadTemplate = () => {
    const blob = new Blob([JSON.stringify(buildAnnalesTemplate(existingSubjects), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = templateName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file: File | undefined) => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    try {
      const raw = extractAnnales(await file.text());
      setOverwrite(false);
      setPreview({
        fileName: file.name,
        raw,
        ...validateAnnales(raw, existingSubjects, existingExams),
      });
    } catch (error) {
      setPreview(null);
      await showAlert(error instanceof Error ? error.message : "Fichier illisible.");
    }
  };

  const toImport = preview ? preview.valid.filter((item) => overwrite || !item.exists) : [];
  const skippedCount = preview ? preview.valid.length - toImport.length : 0;

  const confirmImport = async () => {
    if (!preview || toImport.length === 0) return;
    setImporting(true);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: getAdminHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ annales: preview.raw, overwrite }),
      });

      if (response.status === 401) {
        localStorage.removeItem("admin_token");
        router.push("/admin/login");
        return;
      }

      const result = (await response.json()) as {
        success: boolean;
        message?: string;
        imported?: number;
      };

      if (!result.success) {
        await showAlert(result.message || "Échec de l'import.");
        return;
      }

      setPreview(null);
      await onImported();
      onStatus(`${result.imported} annale(s) importee(s)`);
    } catch (error) {
      console.error("Erreur import annales:", error);
      await showAlert("Erreur lors de l'import (fichier trop volumineux ?).");
    } finally {
      setImporting(false);
    }
  };

  return (
    <section className="mb-6 rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#1d1c18]">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <FileJson className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-black">{title}</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            {description}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={downloadTemplate}
          className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-4 py-2 text-sm font-bold text-stone-700 hover:bg-stone-100 dark:border-stone-800 dark:text-stone-200 dark:hover:bg-stone-800"
        >
          <Download className="h-4 w-4" />
          Telecharger le modele
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
        >
          <Upload className="h-4 w-4" />
          Importer un fichier .json
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json,.txt"
          className="hidden"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
      </div>

      {preview && (
        <div className="mt-4 space-y-3 rounded-lg border border-stone-200 p-4 dark:border-stone-800">
          <p className="text-sm font-bold text-stone-800 dark:text-stone-100">{preview.fileName}</p>

          {preview.errors.length > 0 && (
            <ul className="max-h-40 space-y-1 overflow-y-auto text-sm text-red-600 dark:text-red-300">
              {preview.errors.map((error, position) => (
                <li key={position}>
                  {error.index > 0 ? `Annale n°${error.index} : ` : ""}
                  {error.message}
                </li>
              ))}
            </ul>
          )}

          {preview.valid.length > 0 && (
            <ul className="divide-y divide-stone-100 text-sm dark:divide-stone-800">
              {preview.valid.map((item) => (
                <li key={`${item.slug}-${item.annee}`} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="font-bold text-stone-800 dark:text-stone-100">
                    {item.matiere} — {item.annee}
                  </span>
                  <span className="text-xs text-stone-500 dark:text-stone-400">
                    {item.exam.folders.length} dossier{item.exam.folders.length > 1 ? "s" : ""},{" "}
                    {item.totalQuestions} question{item.totalQuestions > 1 ? "s" : ""}
                  </span>
                  {item.newSubject && (
                    <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-black text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                      nouvelle matiere
                    </span>
                  )}
                  {item.exists && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-black text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                      existe deja
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {preview.valid.some((item) => item.exists) && (
            <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-200">
              <input
                type="checkbox"
                checked={overwrite}
                onChange={(event) => setOverwrite(event.target.checked)}
              />
              Remplacer les annales qui existent deja
              {!overwrite && skippedCount > 0 && ` (${skippedCount} ignoree${skippedCount > 1 ? "s" : ""} sinon)`}
            </label>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirmImport}
              disabled={importing || toImport.length === 0 || preview.errors.length > 0}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check className="h-4 w-4" />
              {importing ? "Import..." : `Importer ${toImport.length} annale${toImport.length > 1 ? "s" : ""}`}
            </button>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-bold text-stone-700 hover:bg-stone-100 dark:border-stone-800 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              Annuler
            </button>
          </div>
          {preview.errors.length > 0 && (
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Corrige les erreurs dans le fichier (ou redemande-le a Claude) avant d&apos;importer : l&apos;import est tout ou rien.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
