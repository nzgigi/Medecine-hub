"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  Edit,
  LogOut,
  AlertCircle,
  RefreshCw,
  Save,
  Plus,
} from "lucide-react";

interface MatiereIndex {
  matiere: string;
  slug: string;
  annee: number;
  total_questions: number;
}

export default function AdminDashboard() {
  const [matieres, setMatieres] = useState<MatiereIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [backing, setBacking] = useState(false);
  const [backupMessage, setBackupMessage] = useState("");

  // création rapide
  const [newMatiere, setNewMatiere] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newAnnee, setNewAnnee] = useState("");
  const [creating, setCreating] = useState(false);

  // recherche
  const [search, setSearch] = useState("");

  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      router.push("/admin/login");
      return;
    }

    loadMatieres();
  }, [router]);

  const loadMatieres = async () => {
    try {
      const response = await fetch("/data/qcm/index.json?t=" + Date.now());
      const data = await response.json();
      setMatieres(data);
      setLoading(false);
    } catch (error) {
      console.error("Erreur chargement:", error);
      setLoading(false);
    }
  };

  const handleSyncIndex = async () => {
    if (
      !confirm(
        "Recalculer tous les totaux de questions depuis les fichiers QCM ?"
      )
    )
      return;

    setSyncing(true);
    setSyncMessage("");

    try {
      const response = await fetch("/api/admin/sync-index", {
        method: "POST",
      });

      const result = await response.json();

      if (result.success) {
        setSyncMessage(result.message);

        if (result.changes.length > 0) {
          console.log("📊 Modifications détectées:");
          console.table(result.changes);
        }

        await loadMatieres();

        setTimeout(() => setSyncMessage(""), 5000);
      } else {
        alert("❌ Erreur: " + result.message);
      }
    } catch (error) {
      console.error("Erreur sync:", error);
      alert("❌ Erreur lors de la synchronisation");
    } finally {
      setSyncing(false);
    }
  };

  const handleBackup = async () => {
    if (
      !confirm(
        "Créer un backup manuel sur GitHub ?\n\nCela va sauvegarder tous les fichiers QCM actuels."
      )
    )
      return;

    setBacking(true);
    setBackupMessage("");

    try {
      const response = await fetch("/api/admin/backup", {
        method: "POST",
      });

      const result = await response.json();

      if (result.success) {
        setBackupMessage(result.message);
        setTimeout(() => setBackupMessage(""), 5000);
      } else {
        alert("❌ Erreur: " + result.message);
      }
    } catch (error) {
      console.error("Erreur backup:", error);
      alert("❌ Erreur lors du backup");
    } finally {
      setBacking(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    router.push("/admin/login");
  };

  const handleCreateQCM = async () => {
    const matiere = newMatiere.trim();
    const slug = newSlug.trim();
    const anneeNum = Number(newAnnee);

    if (!matiere || !slug || !anneeNum || isNaN(anneeNum)) {
      alert("Matière, slug et année valides sont requis");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/qcm/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matiere,
          slug,
          annee: anneeNum,
        }),
      });

      const result = await res.json();
      if (!result.success) {
        alert("❌ Erreur création QCM : " + result.message);
        return;
      }

      await loadMatieres();

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
    } catch (e) {
      console.error(e);
      alert("❌ Erreur lors de la création du QCM");
    } finally {
      setCreating(false);
    }
  };

  const filteredMatieres = useMemo(() => {
    if (!search.trim()) return matieres;
    const q = search.toLowerCase();
    return matieres.filter((m) => {
      return (
        m.matiere.toLowerCase().includes(q) ||
        m.slug.toLowerCase().includes(q) ||
        String(m.annee).includes(q)
      );
    });
  }, [matieres, search]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-600 dark:text-gray-300">
            Chargement...
          </div>
        </div>
      </div>
    );
  }

  const totalQuestions = matieres.reduce(
    (acc, m) => acc + m.total_questions,
    0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-950 dark:to-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
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
                  Gestion des QCM Medecine Hub
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap justify-end">
              {backupMessage && (
                <div className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-200 px-4 py-2 rounded-lg text-sm font-semibold">
                  ✅ {backupMessage}
                </div>
              )}
              {syncMessage && (
                <div className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-200 px-4 py-2 rounded-lg text-sm font-semibold">
                  ✅ {syncMessage}
                </div>
              )}
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

        {/* Stats */}
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
              {matieres.length}
            </div>
            <div className="text-gray-600 dark:text-gray-300 font-medium">
              Fichiers QCM
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6 border-l-4 border-green-500 border border-gray-100 dark:border-gray-800">
            <div className="text-3xl font-bold text-green-600 mb-1">
              {new Set(matieres.map((m) => m.matiere)).size}
            </div>
            <div className="text-gray-600 dark:text-gray-300 font-medium">
              Matières
            </div>
          </div>
        </div>

        {/* Liste des QCM */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Gestion des QCM
            </h2>
            {/* barre de recherche */}
            <input
              type="text"
              placeholder="Rechercher (matière, slug, année)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 px-3 py-2 rounded-lg text-sm min-w-[220px]"
            />
          </div>

          {/* Formulaire création rapide */}
          <div className="mb-6 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Créer un nouveau QCM (matière / année)
            </h3>
            <div className="flex flex-wrap gap-3 items-center">
              <input
                type="text"
                placeholder="Matière (ex: Cardiologie)"
                value={newMatiere}
                onChange={(e) => setNewMatiere(e.target.value)}
                className="border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 px-3 py-2 rounded-lg text-sm min-w-[180px]"
              />
              <input
                type="text"
                placeholder="Slug (ex: cardiologie)"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                className="border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 px-3 py-2 rounded-lg text-sm min-w-[160px]"
              />
              <input
                type="number"
                placeholder="Année (ex: 2026)"
                value={newAnnee}
                onChange={(e) => setNewAnnee(e.target.value)}
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
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Le fichier sera créé dans <code>/public/data/qcm/slug_annee.json</code>{" "}
              et l&apos;index sera mis à jour automatiquement.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200 dark:border-gray-800">
                  <th className="text-left py-4 px-4 font-bold text-gray-700 dark:text-gray-200">
                    Matière
                  </th>
                  <th className="text-left py-4 px-4 font-bold text-gray-700 dark:text-gray-200">
                    Année
                  </th>
                  <th className="text-center py-4 px-4 font-bold text-gray-700 dark:text-gray-200">
                    Questions
                  </th>
                  <th className="text-right py-4 px-4 font-bold text-gray-700 dark:text-gray-200">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredMatieres.map((matiere, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <td className="py-4 px-4 font-semibold text-gray-900 dark:text-gray-100">
                      {matiere.matiere}
                    </td>
                    <td className="py-4 px-4 text-gray-600 dark:text-gray-300">
                      {matiere.annee}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-semibold">
                        {matiere.total_questions}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/edit/${matiere.slug}/${matiere.annee}`}
                          className="flex items-center gap-1 bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-semibold"
                        >
                          <Edit className="w-4 h-4" />
                          Modifier
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredMatieres.length === 0 && (
                  <tr>
                    <td
                      className="py-6 px-4 text-center text-gray-500 dark:text-gray-400"
                      colSpan={4}
                    >
                      Aucun QCM ne correspond à cette recherche.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-6 rounded-lg border border-blue-100 dark:border-blue-700">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-300 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-1">
                Backup automatique sur GitHub
              </h3>
              <p className="text-blue-800 dark:text-blue-200 text-sm">
                Chaque modification est automatiquement sauvegardée sur GitHub.
                Utilisez &quot;Backup GitHub&quot; pour forcer un backup manuel
                avant une grosse modification.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
