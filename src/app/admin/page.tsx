"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  DatabaseZap,
  Edit,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  Wand2,
  X,
} from "lucide-react";

interface MatiereIndex {
  matiere: string;
  slug: string;
  annee: number;
  total_questions: number;
  subjectOrder?: number;
  examOrder?: number;
  examTitle?: string;
}

interface SubjectGroup {
  matiere: string;
  slug: string;
  subjectOrder: number;
  totalQuestions: number;
  exams: MatiereIndex[];
}

interface ValidationIssue {
  file: string;
  level: "error" | "warning";
  message: string;
}

function normalizeIndex(entries: MatiereIndex[]): MatiereIndex[] {
  const subjectOrderMap = new Map<string, number>();
  let nextSubjectOrder = 1;

  entries.forEach((entry) => {
    if (!subjectOrderMap.has(entry.slug)) {
      subjectOrderMap.set(entry.slug, entry.subjectOrder ?? nextSubjectOrder);
      nextSubjectOrder++;
    }
  });

  const grouped = new Map<string, MatiereIndex[]>();

  entries.forEach((entry) => {
    if (!grouped.has(entry.slug)) {
      grouped.set(entry.slug, []);
    }

    grouped.get(entry.slug)?.push(entry);
  });

  const normalized: MatiereIndex[] = [];

  grouped.forEach((subjectEntries, slug) => {
    const sortedExams = [...subjectEntries].sort((a, b) => {
      const orderA = a.examOrder ?? a.annee;
      const orderB = b.examOrder ?? b.annee;
      return orderA - orderB;
    });

    sortedExams.forEach((entry, index) => {
      normalized.push({
        ...entry,
        subjectOrder: subjectOrderMap.get(slug) ?? 999,
        examOrder: index + 1,
        examTitle:
          entry.examTitle?.trim() || `${entry.matiere} - ${entry.annee}`,
      });
    });
  });

  return normalized.sort((a, b) => {
    const subjectDiff = (a.subjectOrder ?? 999) - (b.subjectOrder ?? 999);
    if (subjectDiff !== 0) return subjectDiff;

    return (a.examOrder ?? 999) - (b.examOrder ?? 999);
  });
}

function groupSubjects(entries: MatiereIndex[]): SubjectGroup[] {
  const grouped = new Map<string, SubjectGroup>();

  entries.forEach((entry) => {
    if (!grouped.has(entry.slug)) {
      grouped.set(entry.slug, {
        matiere: entry.matiere,
        slug: entry.slug,
        subjectOrder: entry.subjectOrder ?? 999,
        totalQuestions: 0,
        exams: [],
      });
    }

    const group = grouped.get(entry.slug);

    if (group) {
      group.totalQuestions += entry.total_questions;
      group.exams.push(entry);
    }
  });

  return Array.from(grouped.values())
    .map((group) => ({
      ...group,
      exams: [...group.exams].sort((a, b) => {
        const orderA = a.examOrder ?? a.annee;
        const orderB = b.examOrder ?? b.annee;
        return orderA - orderB;
      }),
    }))
    .sort((a, b) => a.subjectOrder - b.subjectOrder);
}

function confirmDangerousAction(message: string, expectedText: string) {
  const typed = prompt(
    `${message}\n\nPour confirmer, tape exactement : ${expectedText}`
  );

  return typed === expectedText;
}

function getDeleteExamConfirmationText(slug: string, annee: number) {
  return `SUPPRIMER ${slug} ${annee}`;
}

export default function AdminDashboard() {
  const router = useRouter();

  const [entries, setEntries] = useState<MatiereIndex[]>([]);
  const [loading, setLoading] = useState(true);

  const [savingIndex, setSavingIndex] = useState(false);
  const [normalizingIndex, setNormalizingIndex] = useState(false);
  const [migratingQcm, setMigratingQcm] = useState(false);
  const [validatingQcm, setValidatingQcm] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [backing, setBacking] = useState(false);

  const [statusMessage, setStatusMessage] = useState("");

  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>(
    []
  );
  const [validationSummary, setValidationSummary] = useState("");

  const [newMatiere, setNewMatiere] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newAnnee, setNewAnnee] = useState("");
  const [creating, setCreating] = useState(false);

  const [search, setSearch] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("admin_token");

    if (!token) {
      router.push("/admin/login");
      return;
    }

    loadIndex();
  }, [router]);

  const loadIndex = async () => {
    try {
      const response = await fetch("/data/qcm/index.json?t=" + Date.now());
      const data = (await response.json()) as MatiereIndex[];
      setEntries(normalizeIndex(data));
    } catch (error) {
      console.error("Erreur chargement:", error);
      alert("Erreur lors du chargement de l'index QCM");
    } finally {
      setLoading(false);
    }
  };

  const showStatus = (message: string) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(""), 4000);
  };

  const closeValidationReport = () => {
    setValidationIssues([]);
    setValidationSummary("");
  };

  const saveIndex = async (nextEntries: MatiereIndex[]) => {
    setSavingIndex(true);

    try {
      const normalizedEntries = normalizeIndex(nextEntries);

      const response = await fetch("/api/admin/qcm-index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveIndex",
          entries: normalizedEntries,
        }),
      });

      const result = (await response.json()) as {
        success: boolean;
        message?: string;
        entries?: MatiereIndex[];
      };

      if (!result.success) {
        alert("❌ Erreur : " + (result.message || "Erreur inconnue"));
        return;
      }

      setEntries(result.entries || normalizedEntries);
      showStatus("Index sauvegardé");
    } catch (error) {
      console.error("Erreur sauvegarde index:", error);
      alert("❌ Erreur lors de la sauvegarde de l'index");
    } finally {
      setSavingIndex(false);
    }
  };

  const normalizeIndexOnServer = async () => {
    if (
      !confirm(
        "Normaliser l'index ?\n\nCela va remplir automatiquement subjectOrder, examOrder et examTitle dans index.json."
      )
    ) {
      return;
    }

    setNormalizingIndex(true);

    try {
      const response = await fetch("/api/admin/qcm-index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "normalizeIndex",
        }),
      });

      const result = (await response.json()) as {
        success: boolean;
        message?: string;
        entries?: MatiereIndex[];
      };

      if (!result.success) {
        alert("❌ Erreur : " + (result.message || "Erreur inconnue"));
        return;
      }

      setEntries(result.entries || []);
      showStatus(result.message || "Index normalisé");
    } catch (error) {
      console.error("Erreur normalisation index:", error);
      alert("❌ Erreur lors de la normalisation de l'index");
    } finally {
      setNormalizingIndex(false);
    }
  };

  const migrateQcmFolders = async () => {
    if (
      !confirm(
        "Migrer les anciens QCM vers le format dossiers ?\n\nLes anciens fichiers questions[] seront convertis vers folders[]. Les fichiers déjà migrés seront ignorés."
      )
    ) {
      return;
    }

    setMigratingQcm(true);

    try {
      const response = await fetch("/api/admin/migrate-qcm-folders", {
        method: "POST",
      });

      const result = (await response.json()) as {
        success: boolean;
        message?: string;
      };

      if (!result.success) {
        alert("❌ Erreur : " + (result.message || "Erreur inconnue"));
        return;
      }

      showStatus(result.message || "Migration terminée");
      await loadIndex();
    } catch (error) {
      console.error("Erreur migration QCM:", error);
      alert("❌ Erreur lors de la migration des QCM");
    } finally {
      setMigratingQcm(false);
    }
  };

  const validateQcmFiles = async () => {
    setValidatingQcm(true);
    setValidationIssues([]);
    setValidationSummary("");

    try {
      const response = await fetch("/api/admin/validate-qcm", {
        method: "POST",
      });

      const result = (await response.json()) as {
        success: boolean;
        message?: string;
        errorCount?: number;
        warningCount?: number;
        issues?: ValidationIssue[];
      };

      if (!result.success) {
        alert("❌ Erreur : " + (result.message || "Erreur inconnue"));
        return;
      }

      setValidationIssues(result.issues || []);
      setValidationSummary(result.message || "Vérification terminée");

      if (!result.issues || result.issues.length === 0) {
        showStatus(result.message || "Tous les QCM sont valides");
      }
    } catch (error) {
      console.error("Erreur validation QCM:", error);
      alert("❌ Erreur lors de la vérification des QCM");
    } finally {
      setValidatingQcm(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    router.push("/admin/login");
  };

  const handleBackup = async () => {
    if (
      !confirm(
        "Créer un backup manuel sur GitHub ?\n\nCela va sauvegarder les fichiers QCM actuels."
      )
    ) {
      return;
    }

    setBacking(true);

    try {
      const response = await fetch("/api/admin/backup", {
        method: "POST",
      });

      const result = (await response.json()) as {
        success: boolean;
        message?: string;
      };

      if (result.success) {
        showStatus(result.message || "Backup effectué");
      } else {
        alert("❌ Erreur : " + (result.message || "Erreur inconnue"));
      }
    } catch (error) {
      console.error("Erreur backup:", error);
      alert("❌ Erreur lors du backup");
    } finally {
      setBacking(false);
    }
  };

  const handleSyncIndex = async () => {
    if (
      !confirm(
        "Recalculer tous les totaux de questions depuis les fichiers QCM ?"
      )
    ) {
      return;
    }

    setSyncing(true);

    try {
      const response = await fetch("/api/admin/sync-index", {
        method: "POST",
      });

      const result = (await response.json()) as {
        success: boolean;
        message?: string;
      };

      if (result.success) {
        showStatus(result.message || "Synchronisation effectuée");
        await loadIndex();
      } else {
        alert("❌ Erreur : " + (result.message || "Erreur inconnue"));
      }
    } catch (error) {
      console.error("Erreur sync:", error);
      alert("❌ Erreur lors de la synchronisation");
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateQCM = async () => {
    const matiere = newMatiere.trim();
    const slug = newSlug.trim();
    const anneeNum = Number(newAnnee);

    if (!matiere || !slug || !anneeNum || Number.isNaN(anneeNum)) {
      alert("Matière, slug et année valides sont requis");
      return;
    }

    setCreating(true);

    try {
      const response = await fetch("/api/qcm/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matiere, slug, annee: anneeNum }),
      });

      const result = (await response.json()) as {
        success: boolean;
        message?: string;
      };

      if (!result.success) {
        alert(
          "❌ Erreur création QCM : " + (result.message || "Erreur inconnue")
        );
        return;
      }

      await loadIndex();

      setNewMatiere("");
      setNewSlug("");
      setNewAnnee("");

      if (
        confirm(
          "QCM créé / mis à jour pour cette matière et cette année.\n\nVoulez-vous l'éditer maintenant ?"
        )
      ) {
        router.push(`/admin/edit/${slug}/${anneeNum}`);
      }
    } catch (error) {
      console.error(error);
      alert("❌ Erreur lors de la création du QCM");
    } finally {
      setCreating(false);
    }
  };

  const renameSubject = (slug: string, newName: string) => {
    const nextEntries = entries.map((entry) =>
      entry.slug === slug
        ? {
            ...entry,
            matiere: newName,
            examTitle:
              entry.examTitle && entry.examTitle.includes(entry.matiere)
                ? entry.examTitle.replace(entry.matiere, newName)
                : entry.examTitle,
          }
        : entry
    );

    setEntries(nextEntries);
  };

  const renameExam = (slug: string, annee: number, newTitle: string) => {
    const nextEntries = entries.map((entry) =>
      entry.slug === slug && entry.annee === annee
        ? {
            ...entry,
            examTitle: newTitle,
          }
        : entry
    );

    setEntries(nextEntries);
  };

  const moveSubject = (slug: string, direction: "up" | "down") => {
    const groups = groupSubjects(normalizeIndex(entries));
    const index = groups.findIndex((group) => group.slug === slug);
    const newIndex = direction === "up" ? index - 1 : index + 1;

    if (index < 0 || newIndex < 0 || newIndex >= groups.length) return;

    [groups[index], groups[newIndex]] = [groups[newIndex], groups[index]];

    const orderMap = new Map<string, number>();

    groups.forEach((group, groupIndex) => {
      orderMap.set(group.slug, groupIndex + 1);
    });

    const nextEntries = entries.map((entry) => ({
      ...entry,
      subjectOrder: orderMap.get(entry.slug) ?? entry.subjectOrder,
    }));

    setEntries(normalizeIndex(nextEntries));
  };

  const moveExam = (
    slug: string,
    annee: number,
    direction: "up" | "down"
  ) => {
    const subjectEntries = entries
      .filter((entry) => entry.slug === slug)
      .sort((a, b) => (a.examOrder ?? a.annee) - (b.examOrder ?? b.annee));

    const index = subjectEntries.findIndex((entry) => entry.annee === annee);
    const newIndex = direction === "up" ? index - 1 : index + 1;

    if (index < 0 || newIndex < 0 || newIndex >= subjectEntries.length) return;

    [subjectEntries[index], subjectEntries[newIndex]] = [
      subjectEntries[newIndex],
      subjectEntries[index],
    ];

    const examOrderMap = new Map<number, number>();

    subjectEntries.forEach((entry, entryIndex) => {
      examOrderMap.set(entry.annee, entryIndex + 1);
    });

    const nextEntries = entries.map((entry) => {
      if (entry.slug !== slug) return entry;

      return {
        ...entry,
        examOrder: examOrderMap.get(entry.annee) ?? entry.examOrder,
      };
    });

    setEntries(normalizeIndex(nextEntries));
  };

  const deleteExam = async (slug: string, annee: number) => {
    const expectedText = getDeleteExamConfirmationText(slug, annee);

    const confirmed = confirmDangerousAction(
      `⚠️ Tu es sur le point de supprimer définitivement l'épreuve ${slug} ${annee}.\n\nLe fichier JSON de cette épreuve sera supprimé.`,
      expectedText
    );

    if (!confirmed) {
      alert("Suppression annulée.");
      return;
    }

    try {
      const response = await fetch("/api/admin/qcm-index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteExam", slug, annee }),
      });

      const result = (await response.json()) as {
        success: boolean;
        message?: string;
      };

      if (!result.success) {
        alert("❌ Erreur : " + (result.message || "Erreur inconnue"));
        return;
      }

      await loadIndex();
      showStatus("Épreuve supprimée");
    } catch (error) {
      console.error("Erreur suppression épreuve:", error);
      alert("❌ Erreur lors de la suppression");
    }
  };

  const deleteSubject = async (slug: string, matiere: string) => {
    const expectedText = `SUPPRIMER ${slug}`;

    const confirmed = confirmDangerousAction(
      `⚠️ Tu es sur le point de supprimer définitivement la matière "${matiere}".\n\nToutes les épreuves JSON de cette matière seront supprimées.`,
      expectedText
    );

    if (!confirmed) {
      alert("Suppression annulée.");
      return;
    }

    try {
      const response = await fetch("/api/admin/qcm-index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteSubject", slug }),
      });

      const result = (await response.json()) as {
        success: boolean;
        message?: string;
      };

      if (!result.success) {
        alert("❌ Erreur : " + (result.message || "Erreur inconnue"));
        return;
      }

      await loadIndex();
      showStatus("Matière supprimée");
    } catch (error) {
      console.error("Erreur suppression matière:", error);
      alert("❌ Erreur lors de la suppression");
    }
  };

  const subjects = useMemo(() => {
    const normalized = normalizeIndex(entries);
    const groups = groupSubjects(normalized);

    if (!search.trim()) return groups;

    const query = search.toLowerCase();

    return groups
      .map((subject) => ({
        ...subject,
        exams: subject.exams.filter((exam) => {
          return (
            subject.matiere.toLowerCase().includes(query) ||
            subject.slug.toLowerCase().includes(query) ||
            String(exam.annee).includes(query) ||
            (exam.examTitle || "").toLowerCase().includes(query)
          );
        }),
      }))
      .filter((subject) => subject.exams.length > 0);
  }, [entries, search]);

  const totalQuestions = entries.reduce(
    (acc, entry) => acc + entry.total_questions,
    0
  );

  const totalSubjects = new Set(entries.map((entry) => entry.slug)).size;

  const validationErrorCount = validationIssues.filter(
    (issue) => issue.level === "error"
  ).length;

  const validationWarningCount = validationIssues.filter(
    (issue) => issue.level === "warning"
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4" />
          <div className="text-xl text-gray-600 dark:text-gray-300">
            Chargement...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-950 dark:to-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 mb-8 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-white" />
              </div>

              <div>
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">
                  Admin Dashboard
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Gestion des matières, épreuves et QCM
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap justify-end">
              {statusMessage && (
                <div className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-200 px-4 py-2 rounded-lg text-sm font-semibold">
                  ✅ {statusMessage}
                </div>
              )}

              <button
                onClick={() => saveIndex(entries)}
                disabled={savingIndex}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {savingIndex ? "Sauvegarde..." : "Sauvegarder l'ordre"}
              </button>

              <button
                onClick={normalizeIndexOnServer}
                disabled={normalizingIndex}
                className="flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Wand2
                  className={`w-4 h-4 ${
                    normalizingIndex ? "animate-pulse" : ""
                  }`}
                />
                {normalizingIndex ? "Normalisation..." : "Normaliser l’index"}
              </button>

              <button
                onClick={migrateQcmFolders}
                disabled={migratingQcm}
                className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <DatabaseZap
                  className={`w-4 h-4 ${migratingQcm ? "animate-pulse" : ""}`}
                />
                {migratingQcm ? "Migration..." : "Migrer les QCM"}
              </button>

              <button
                onClick={validateQcmFiles}
                disabled={validatingQcm}
                className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShieldCheck
                  className={`w-4 h-4 ${
                    validatingQcm ? "animate-pulse" : ""
                  }`}
                />
                {validatingQcm ? "Vérification..." : "Vérifier les QCM"}
              </button>

              <button
                onClick={handleBackup}
                disabled={backing}
                className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className={`w-4 h-4 ${backing ? "animate-pulse" : ""}`} />
                {backing ? "Backup..." : "Backup GitHub"}
              </button>

              <button
                onClick={handleSyncIndex}
                disabled={syncing}
                className="flex items-center gap-2 bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw
                  className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`}
                />
                {syncing ? "Synchronisation..." : "Synchroniser"}
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors font-semibold"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6 border-l-4 border-blue-500 border border-gray-100 dark:border-gray-800">
            <div className="text-3xl font-bold text-blue-600 mb-1">
              {totalQuestions}
            </div>
            <div className="text-gray-600 dark:text-gray-300 font-medium">
              Questions totales
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6 border-l-4 border-purple-500 border border-gray-100 dark:border-gray-800">
            <div className="text-3xl font-bold text-purple-600 mb-1">
              {entries.length}
            </div>
            <div className="text-gray-600 dark:text-gray-300 font-medium">
              Épreuves
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6 border-l-4 border-green-500 border border-gray-100 dark:border-gray-800">
            <div className="text-3xl font-bold text-green-600 mb-1">
              {totalSubjects}
            </div>
            <div className="text-gray-600 dark:text-gray-300 font-medium">
              Matières
            </div>
          </div>
        </div>

        {validationSummary && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-800 mb-8">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Rapport de vérification des QCM
                </h2>

                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  {validationSummary}
                </p>

                {validationIssues.length > 0 && (
                  <div className="flex gap-3 mt-3 flex-wrap">
                    <span className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-200 px-3 py-1 rounded-full text-sm font-semibold">
                      ❌ {validationErrorCount} erreur(s)
                    </span>
                    <span className="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-200 px-3 py-1 rounded-full text-sm font-semibold">
                      ⚠️ {validationWarningCount} warning(s)
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={closeValidationReport}
                className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <X className="w-4 h-4" />
                Fermer
              </button>
            </div>

            {validationIssues.length === 0 ? (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-200 rounded-xl p-4 font-semibold">
                ✅ Aucun problème détecté. Les QCM sont propres.
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
                {validationIssues.map((issue, index) => (
                  <div
                    key={`${issue.file}-${index}`}
                    className={`rounded-xl border p-4 ${
                      issue.level === "error"
                        ? "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700"
                        : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-xl">
                        {issue.level === "error" ? "❌" : "⚠️"}
                      </div>

                      <div>
                        <div
                          className={`font-bold ${
                            issue.level === "error"
                              ? "text-red-800 dark:text-red-200"
                              : "text-yellow-800 dark:text-yellow-200"
                          }`}
                        >
                          {issue.file}
                        </div>

                        <div
                          className={`text-sm mt-1 ${
                            issue.level === "error"
                              ? "text-red-700 dark:text-red-200"
                              : "text-yellow-700 dark:text-yellow-200"
                          }`}
                        >
                          {issue.message}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-800 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Créer un nouveau QCM
          </h2>

          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="text"
              placeholder="Matière (ex: Cardiologie)"
              value={newMatiere}
              onChange={(event) => setNewMatiere(event.target.value)}
              className="border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 px-3 py-2 rounded-lg text-sm min-w-[180px]"
            />

            <input
              type="text"
              placeholder="Slug (ex: cardiologie)"
              value={newSlug}
              onChange={(event) => setNewSlug(event.target.value)}
              className="border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 px-3 py-2 rounded-lg text-sm min-w-[160px]"
            />

            <input
              type="number"
              placeholder="Année"
              value={newAnnee}
              onChange={(event) => setNewAnnee(event.target.value)}
              className="border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 px-3 py-2 rounded-lg text-sm w-28"
            />

            <button
              onClick={handleCreateQCM}
              disabled={creating}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              {creating ? "Création..." : "Créer le QCM"}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Matières et épreuves
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Renomme, supprime et réordonne les matières et épreuves.
              </p>
            </div>

            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 px-3 py-2 rounded-lg text-sm min-w-[220px]"
            />
          </div>

          <div className="space-y-6">
            {subjects.map((subject, subjectIndex) => (
              <section
                key={subject.slug}
                className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
              >
                <div className="bg-gray-50 dark:bg-gray-950 p-5 border-b border-gray-200 dark:border-gray-800">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-[240px]">
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                        Nom de la matière
                      </label>

                      <input
                        value={subject.matiere}
                        onChange={(event) =>
                          renameSubject(subject.slug, event.target.value)
                        }
                        className="w-full border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 rounded-lg font-bold"
                      />

                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Slug : {subject.slug} • {subject.totalQuestions}{" "}
                        question(s)
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => moveSubject(subject.slug, "up")}
                        disabled={subjectIndex === 0}
                        className="p-2 rounded-lg hover:bg-white dark:hover:bg-gray-800 disabled:opacity-30"
                        title="Monter la matière"
                      >
                        <ArrowUp className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() => moveSubject(subject.slug, "down")}
                        disabled={subjectIndex === subjects.length - 1}
                        className="p-2 rounded-lg hover:bg-white dark:hover:bg-gray-800 disabled:opacity-30"
                        title="Descendre la matière"
                      >
                        <ArrowDown className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() =>
                          deleteSubject(subject.slug, subject.matiere)
                        }
                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Supprimer la matière"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {subject.exams.map((exam, examIndex) => (
                    <div
                      key={`${exam.slug}-${exam.annee}`}
                      className="p-4 flex items-center justify-between gap-4 flex-wrap"
                    >
                      <div className="flex-1 min-w-[240px]">
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                          Nom de l&apos;épreuve
                        </label>

                        <input
                          value={
                            exam.examTitle || `${exam.matiere} - ${exam.annee}`
                          }
                          onChange={(event) =>
                            renameExam(
                              exam.slug,
                              exam.annee,
                              event.target.value
                            )
                          }
                          className="w-full border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 px-3 py-2 rounded-lg"
                        />

                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Année : {exam.annee} • {exam.total_questions}{" "}
                          question(s)
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => moveExam(exam.slug, exam.annee, "up")}
                          disabled={examIndex === 0}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
                          title="Monter l'épreuve"
                        >
                          <ArrowUp className="w-5 h-5" />
                        </button>

                        <button
                          onClick={() =>
                            moveExam(exam.slug, exam.annee, "down")
                          }
                          disabled={examIndex === subject.exams.length - 1}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
                          title="Descendre l'épreuve"
                        >
                          <ArrowDown className="w-5 h-5" />
                        </button>

                        <Link
                          href={`/admin/edit/${exam.slug}/${exam.annee}`}
                          className="flex items-center gap-1 bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-semibold"
                        >
                          <Edit className="w-4 h-4" />
                          Modifier
                        </Link>

                        <button
                          onClick={() => deleteExam(exam.slug, exam.annee)}
                          className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Supprimer l'épreuve"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {subjects.length === 0 && (
              <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                Aucun résultat.
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-6 rounded-lg border border-blue-100 dark:border-blue-700">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-300 flex-shrink-0 mt-0.5" />

            <div>
              <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-1">
                Important
              </h3>
              <p className="text-blue-800 dark:text-blue-200 text-sm">
                Après avoir renommé ou réordonné les matières/épreuves, cliquez
                sur “Sauvegarder l&apos;ordre”. Les suppressions sont appliquées
                immédiatement après confirmation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}