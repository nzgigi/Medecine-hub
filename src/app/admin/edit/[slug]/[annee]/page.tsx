"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Save,
  Plus,
  Trash2,
  ArrowLeft,
  Check,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  ImagePlus,
  X,
} from "lucide-react";

interface Question {
  id: number;
  type: string; // "QRU" | "QRM" | "QRP" | "QROC"
  contexte?: string;
  question: string;
  choix: string[];
  reponses: string[]; // pour QROC: banque de réponses texte
  image?: string;
  maxReponses?: number; // pour QRP : nombre max de réponses cochables
}

interface QCMData {
  matiere: string;
  annee: number;
  total_questions: number;
  questions: Question[];
}

export default function EditQCMPage() {
  const params = useParams();
  const router = useRouter();

  const slug = params.slug as string;
  const annee = params.annee as string;

  const [qcmData, setQcmData] = useState<QCMData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  /* ===================== LOAD ===================== */

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      router.push("/admin/login");
      return;
    }
    loadQCM();
  }, [slug, annee, router]);

  const loadQCM = async () => {
    try {
      const draft = localStorage.getItem(`draft_${slug}_${annee}`);
      if (draft) {
        const useDraft = confirm(
          "Un brouillon non sauvegardé a été trouvé. Voulez-vous le reprendre ?"
        );
        if (useDraft) {
          setQcmData(JSON.parse(draft));
          setHasUnsavedChanges(true);
          setLoading(false);
          return;
        } else {
          localStorage.removeItem(`draft_${slug}_${annee}`);
        }
      }

      const response = await fetch(`/data/qcm/${slug}_${annee}.json`);
      const data = await response.json();
      setQcmData(data);
    } catch (error) {
      console.error("Erreur chargement:", error);
      alert("Erreur lors du chargement du QCM");
    } finally {
      setLoading(false);
    }
  };

  /* ===================== AUTO-SAVE LOCAL ===================== */

  useEffect(() => {
    if (!qcmData || !hasUnsavedChanges) return;

    const autoSave = setInterval(() => {
      localStorage.setItem(
        `draft_${slug}_${annee}`,
        JSON.stringify(qcmData)
      );
      console.log("📝 Brouillon sauvegardé localement");
    }, 30000);

    return () => clearInterval(autoSave);
  }, [qcmData, hasUnsavedChanges, slug, annee]);

  /* ===================== PREVENT QUIT ===================== */

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue =
          "Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter ?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () =>
      window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  /* ===================== VALIDATION ===================== */

  const validateQCM = () => {
    if (!qcmData) return false;

    for (const q of qcmData.questions) {
      if (!q.question.trim()) {
        alert(`❌ Question ${q.id} : Le texte de la question est vide`);
        return false;
      }

      if (q.type === "QROC") {
        if (q.reponses.length === 0) {
          alert(
            `❌ Question ${q.id} : Aucune réponse attendue définie pour la QROC`
          );
          return false;
        }
        continue;
      }

      if (q.reponses.length === 0) {
        alert(`❌ Question ${q.id} : Aucune réponse correcte sélectionnée`);
        return false;
      }
      if (q.choix.length < 2) {
        alert(
          `❌ Question ${q.id} : Il faut au moins 2 choix de réponse`
        );
        return false;
      }
      for (const rep of q.reponses) {
        const exists = q.choix.some((c) => c.startsWith(rep + ")"));
        if (!exists) {
          alert(
            `❌ Question ${q.id} : La réponse "${rep}" n'existe pas dans les choix`
          );
          return false;
        }
      }

      if (q.type === "QRP") {
        if (!q.maxReponses || q.maxReponses < 1) {
          alert(
            `❌ Question ${q.id} : QRP sans nombre de réponses max (maxReponses)`
          );
          return false;
        }
        if (q.maxReponses > q.choix.length) {
          alert(
            `❌ Question ${q.id} : maxReponses (${q.maxReponses}) > nombre de choix`
          );
          return false;
        }
      }
    }
    return true;
  };

  /* ===================== SAVE ===================== */

  const handleSave = async () => {
    if (!qcmData) return;
    if (!validateQCM()) return;

    setSaving(true);
    try {
      const response = await fetch("/api/qcm/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matiere: slug, annee, qcmData }),
      });

      const result = await response.json();

      if (result.success) {
        setSaveSuccess(true);
        setHasUnsavedChanges(false);
        localStorage.removeItem(`draft_${slug}_${annee}`);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert("❌ Erreur : " + result.message);
      }
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      alert("❌ Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  /* ===================== IMAGE UPLOAD ===================== */

  const handleImageUpload = async (qIndex: number, file: File) => {
    if (!qcmData) return;

    setUploadingIndex(qIndex);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("slug", slug);
      formData.append("annee", annee);
      formData.append("questionId", String(qcmData.questions[qIndex].id));

      const res = await fetch("/api/qcm/upload-image", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (result.success) {
        const questions = [...qcmData.questions];
        questions[qIndex] = { ...questions[qIndex], image: result.path };
        setQcmData({ ...qcmData, questions });
        setHasUnsavedChanges(true);
      } else {
        alert("❌ Erreur upload : " + result.message);
      }
    } catch (error) {
      console.error("Erreur upload image:", error);
      alert("❌ Erreur lors de l'upload");
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleImageDelete = async (qIndex: number) => {
    if (!qcmData) return;
    const imagePath = qcmData.questions[qIndex].image;
    if (!imagePath) return;

    if (!confirm("Supprimer l'image de cette question ?")) return;

    try {
      await fetch("/api/qcm/delete-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagePath }),
      });
    } catch {}

    const questions = [...qcmData.questions];
    const { image, ...rest } = questions[qIndex];
    questions[qIndex] = rest as Question;
    setQcmData({ ...qcmData, questions });
    setHasUnsavedChanges(true);
  };

  /* ===================== HELPERS ===================== */

  const updateQuestion = (
    index: number,
    field: keyof Question,
    value: any
  ) => {
    if (!qcmData) return;
    const questions = [...qcmData.questions];
    questions[index] = { ...questions[index], [field]: value };
    setQcmData({
      ...qcmData,
      questions,
      total_questions: questions.length,
    });
    setHasUnsavedChanges(true);
  };

  const updateChoix = (
    qIndex: number,
    cIndex: number,
    value: string
  ) => {
    if (!qcmData) return;
    const questions = [...qcmData.questions];
    questions[qIndex].choix[cIndex] = value;
    setQcmData({ ...qcmData, questions });
    setHasUnsavedChanges(true);
  };

  const addChoix = (qIndex: number) => {
    if (!qcmData) return;
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const questions = [...qcmData.questions];
    const next = letters[questions[qIndex].choix.length];
    if (!next) {
      alert("Maximum 26 choix atteint");
      return;
    }
    questions[qIndex].choix.push(`${next}) `);
    setQcmData({ ...qcmData, questions });
    setHasUnsavedChanges(true);
  };

  const removeChoix = (qIndex: number, cIndex: number) => {
    if (!qcmData) return;
    const questions = [...qcmData.questions];
    if (questions[qIndex].choix.length <= 2) {
      alert("Il faut au moins 2 choix");
      return;
    }

    const letter = questions[qIndex].choix[cIndex].charAt(0);
    questions[qIndex].reponses = questions[qIndex].reponses.filter(
      (r) => r !== letter
    );
    questions[qIndex].choix.splice(cIndex, 1);

    questions[qIndex].choix = questions[qIndex].choix.map((c, i) => {
      const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      return `${letters[i]}) ${c.substring(3)}`;
    });

    setQcmData({ ...qcmData, questions });
    setHasUnsavedChanges(true);
  };

  const moveChoix = (
    qIndex: number,
    cIndex: number,
    direction: "up" | "down"
  ) => {
    if (!qcmData) return;
    const questions = [...qcmData.questions];
    const choix = [...questions[qIndex].choix];

    const newIndex = direction === "up" ? cIndex - 1 : cIndex + 1;
    if (newIndex < 0 || newIndex >= choix.length) return;

    [choix[cIndex], choix[newIndex]] = [choix[newIndex], choix[cIndex]];

    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    questions[qIndex].choix = choix.map(
      (c, i) => `${letters[i]}) ${c.substring(3)}`
    );

    setQcmData({ ...qcmData, questions });
    setHasUnsavedChanges(true);
  };

  const toggleReponse = (qIndex: number, letter: string) => {
    if (!qcmData) return;
    const questions = [...qcmData.questions];
    const reps = questions[qIndex].reponses;
    const type = questions[qIndex].type;

    if (type === "QROC") {
      alert(
        "Pour les QROC, utilisez le champ \"Réponse(s) correcte(s)\" (texte) plutôt que les lettres."
      );
      return;
    }

    if (type === "QRU") {
      questions[qIndex].reponses = [letter];
    } else {
      questions[qIndex].reponses = reps.includes(letter)
        ? reps.filter((r) => r !== letter)
        : [...reps, letter].sort();
    }

    setQcmData({ ...qcmData, questions });
    setHasUnsavedChanges(true);
  };

  const addQuestion = () => {
    if (!qcmData) return;
    const id = qcmData.questions.length + 1;
    const letters = ["A", "B", "C", "D", "E"];

    setQcmData({
      ...qcmData,
      questions: [
        ...qcmData.questions,
        {
          id,
          type: "QRM",
          contexte: "",
          question: "",
          choix: letters.map((L) => `${L}) `),
          reponses: [],
          maxReponses: 3, // valeur par défaut pour QRP si on change le type après
        },
      ],
      total_questions: id,
    });
    setHasUnsavedChanges(true);
  };

  const deleteQuestion = (index: number) => {
    if (!qcmData) return;
    if (!confirm("⚠️ Supprimer cette question définitivement ?")) return;

    const questions = qcmData.questions
      .filter((_, i) => i !== index)
      .map((q, i) => ({ ...q, id: i + 1 }));

    setQcmData({
      ...qcmData,
      questions,
      total_questions: questions.length,
    });
    setHasUnsavedChanges(true);
  };

  /* ===================== UI ===================== */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-xl text-gray-800 dark:text-gray-100">
          Chargement…
        </div>
      </div>
    );
  }

  if (!qcmData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-xl text-red-600">Erreur de chargement</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 text-gray-900 dark:text-gray-100">
      <div className="max-w-6xl mx-auto px-4">
        {/* HEADER */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow mb-6 sticky top-4 z-10 border border-gray-100 dark:border-gray-800">
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (
                    hasUnsavedChanges &&
                    !confirm(
                      "Vous avez des modifications non sauvegardées. Quitter quand même ?"
                    )
                  )
                    return;
                  router.push("/admin");
                }}
                className="flex gap-2 text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700 dark:hover:text-blue-300"
              >
                <ArrowLeft /> Retour
              </button>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {qcmData.matiere} - {qcmData.annee} (
                {qcmData.total_questions} questions)
              </div>
            </div>

            <div className="flex gap-3 items-center flex-wrap justify-end">
              {hasUnsavedChanges && !saveSuccess && (
                <div className="flex items-center gap-2 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-200 px-3 py-2 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4" />
                  Non sauvegardé
                </div>
              )}
              {saveSuccess && (
                <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-200 px-3 py-2 rounded-lg">
                  <Check className="w-5 h-5" /> Sauvegardé
                </div>
              )}
              <button
                onClick={addQuestion}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-all flex items-center gap-2"
              >
                <Plus className="w-5 h-5" /> Ajouter une question
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-5 h-5" />{" "}
                {saving ? "Sauvegarde..." : "Sauvegarder"}
              </button>
            </div>
          </div>
        </div>

        {/* QUESTIONS */}
        <div className="space-y-6">
          {qcmData.questions.map((q, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-md border-2 border-gray-100 dark:border-gray-800"
            >
              {/* Header Question */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-xl text-blue-600">
                    Q{q.id}
                  </span>
                  <select
                    value={q.type}
                    onChange={(e) =>
                      updateQuestion(i, "type", e.target.value)
                    }
                    className="border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-1 text-sm font-semibold"
                  >
                    <option value="QRU">QRU (Réponse Unique)</option>
                    <option value="QRM">QRM (Réponses Multiples)</option>
                    <option value="QRP">QRP (Réponse Précisée)</option>
                    <option value="QROC">QROC (Réponse Ouverte Courte)</option>
                  </select>
                  {q.type === "QRP" && (
                    <input
                      type="number"
                      min={1}
                      max={q.choix.length || 5}
                      value={q.maxReponses ?? 3}
                      onChange={(e) =>
                        updateQuestion(
                          i,
                          "maxReponses",
                          Number(e.target.value)
                        )
                      }
                      className="w-20 border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-2 py-1 text-sm"
                      placeholder="Max"
                      title="Nombre de réponses à cocher (QRP)"
                    />
                  )}
                </div>
                <button
                  onClick={() => deleteQuestion(i)}
                  className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-all"
                  title="Supprimer la question"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {/* Contexte */}
              <div className="mb-3">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Contexte clinique (optionnel)
                </label>
                <textarea
                  value={q.contexte || ""}
                  onChange={(e) =>
                    updateQuestion(i, "contexte", e.target.value)
                  }
                  placeholder="Ex: Patient de 65 ans présentant une dyspnée..."
                  className="w-full border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-3 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                  rows={2}
                />
              </div>

              {/* Question */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Question
                </label>
                <textarea
                  value={q.question}
                  onChange={(e) =>
                    updateQuestion(i, "question", e.target.value)
                  }
                  className="w-full border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-3 rounded-lg focus:border-blue-500 focus:outline-none font-medium"
                  rows={3}
                />
              </div>

              {/* IMAGE */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Image (optionnelle)
                </label>

                {q.image ? (
                  <div className="relative inline-block">
                    <img
                      src={q.image}
                      alt={`Image Q${q.id}`}
                      className="max-h-48 rounded-lg border-2 border-gray-200 dark:border-gray-700 object-contain bg-gray-50 dark:bg-gray-800"
                    />
                    <button
                      onClick={() => handleImageDelete(i)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-md"
                      title="Supprimer l'image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-3 cursor-pointer w-fit bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all px-5 py-3 rounded-xl">
                    {uploadingIndex === i ? (
                      <span className="text-sm text-gray-500 dark:text-gray-300">
                        Upload en cours...
                      </span>
                    ) : (
                      <>
                        <ImagePlus className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-500 dark:text-gray-300 font-medium">
                          Ajouter une image
                        </span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingIndex === i}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(i, file);
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Choix pour QRU / QRM / QRP */}
              {q.type !== "QROC" && (
                <div className="mb-3">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    Choix de réponses (cliquez sur la lettre pour marquer
                    comme correcte)
                  </label>
                  {q.choix.map((c, ci) => {
                    const letter = c.charAt(0);
                    const isCorrect = q.reponses.includes(letter);

                    return (
                      <div
                        key={ci}
                        className="flex gap-2 mb-2 items-center group"
                      >
                        <button
                          onClick={() => toggleReponse(i, letter)}
                          className={`w-10 h-10 font-bold rounded-lg transition-all flex-shrink-0 ${
                            isCorrect
                              ? "bg-green-500 text-white shadow-lg"
                              : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600"
                          }`}
                          title={
                            isCorrect
                              ? "Réponse correcte"
                              : "Marquer comme correcte"
                          }
                        >
                          {letter}
                        </button>
                        <input
                          value={c}
                          onChange={(e) =>
                            updateChoix(i, ci, e.target.value)
                          }
                          className="flex-1 border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-2 rounded-lg focus:border-blue-500 focus:outline-none"
                        />
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => moveChoix(i, ci, "up")}
                            disabled={ci === 0}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-30"
                            title="Déplacer vers le haut"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => moveChoix(i, ci, "down")}
                            disabled={ci === q.choix.length - 1}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-30"
                            title="Déplacer vers le bas"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeChoix(i, ci)}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 rounded"
                            title="Supprimer ce choix"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <button
                    onClick={() => addChoix(i)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold mt-2 hover:underline"
                  >
                    + Ajouter un choix
                  </button>
                </div>
              )}

              {/* Réponses QROC (banque de réponses texte) */}
              {q.type === "QROC" && (
                <div className="mb-3">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    Réponses attendues (QROC) — séparées par des virgules
                  </label>
                  <input
                    type="text"
                    value={q.reponses.join(", ")}
                    onChange={(e) =>
                      updateQuestion(
                        i,
                        "reponses",
                        e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean)
                      )
                    }
                    className="w-full border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-2 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                    placeholder="hyponatrémie, hyponatremie"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    La réponse de l&apos;étudiant devra correspondre à l&apos;une de ces
                    valeurs (comparaison en minuscules, espaces ignorés).
                  </p>
                </div>
              )}

              {/* Réponses sélectionnées */}
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-600">
                <span className="text-sm font-semibold text-green-800 dark:text-green-200">
                  Réponse(s) correcte(s):{" "}
                  {q.reponses.length > 0
                    ? q.reponses.join(", ")
                    : "Aucune"}
                </span>
                {q.type === "QRP" && q.maxReponses && (
                  <span className="ml-3 text-xs text-green-700 dark:text-green-300">
                    (QRP : {q.maxReponses} réponses attendues)
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
