"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, Plus, Trash2, ArrowLeft, Check, ChevronUp, ChevronDown, AlertCircle } from "lucide-react";

/* ===================== TYPES ===================== */

interface Question {
  id: number;
  type: string;
  contexte?: string;
  question: string;
  choix: string[];
  reponses: string[];
}

interface QCMData {
  matiere: string;
  annee: number;
  total_questions: number;
  questions: Question[];
}

/* ===================== PAGE ===================== */

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

  /* ===================== LOAD ===================== */

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      router.push("/admin/login");
      return;
    }
    loadQCM();
  }, [slug, annee]);

  const loadQCM = async () => {
    try {
      // Vérifier s'il y a un brouillon
      const draft = localStorage.getItem(`draft_${slug}_${annee}`);
      if (draft) {
        const useDraft = confirm('Un brouillon non sauvegardé a été trouvé. Voulez-vous le reprendre ?');
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
      localStorage.setItem(`draft_${slug}_${annee}`, JSON.stringify(qcmData));
      console.log('📝 Brouillon sauvegardé localement');
    }, 30000); // Toutes les 30 secondes
    
    return () => clearInterval(autoSave);
  }, [qcmData, hasUnsavedChanges, slug, annee]);

  /* ===================== PREVENT QUIT ===================== */

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter ?';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  /* ===================== VALIDATION ===================== */

  const validateQCM = () => {
    if (!qcmData) return false;
    
    for (const q of qcmData.questions) {
      if (!q.question.trim()) {
        alert(`❌ Question ${q.id} : Le texte de la question est vide`);
        return false;
      }
      if (q.reponses.length === 0) {
        alert(`❌ Question ${q.id} : Aucune réponse correcte sélectionnée`);
        return false;
      }
      if (q.choix.length < 2) {
        alert(`❌ Question ${q.id} : Il faut au moins 2 choix de réponse`);
        return false;
      }
      // Vérifier que les réponses existent dans les choix
      for (const rep of q.reponses) {
        const exists = q.choix.some(c => c.startsWith(rep + ')'));
        if (!exists) {
          alert(`❌ Question ${q.id} : La réponse "${rep}" n'existe pas dans les choix`);
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
        body: JSON.stringify({
          matiere: slug,
          annee,
          qcmData,
        }),
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

  /* ===================== HELPERS ===================== */

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    if (!qcmData) return;
    const questions = [...qcmData.questions];
    questions[index] = { ...questions[index], [field]: value };
    setQcmData({ ...qcmData, questions, total_questions: questions.length });
    setHasUnsavedChanges(true);
  };

  const updateChoix = (qIndex: number, cIndex: number, value: string) => {
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
    questions[qIndex].choix.push(`${next}) Nouvelle réponse`);
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
    // Retirer la lettre des réponses si elle y est
    questions[qIndex].reponses = questions[qIndex].reponses.filter(r => r !== letter);
    
    questions[qIndex].choix.splice(cIndex, 1);
    
    // Réorganiser les lettres
    questions[qIndex].choix = questions[qIndex].choix.map((c, i) => {
      const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      return `${letters[i]}) ${c.substring(3)}`;
    });
    
    setQcmData({ ...qcmData, questions });
    setHasUnsavedChanges(true);
  };

  const moveChoix = (qIndex: number, cIndex: number, direction: 'up' | 'down') => {
    if (!qcmData) return;
    const questions = [...qcmData.questions];
    const choix = [...questions[qIndex].choix];
    
    const newIndex = direction === 'up' ? cIndex - 1 : cIndex + 1;
    if (newIndex < 0 || newIndex >= choix.length) return;
    
    [choix[cIndex], choix[newIndex]] = [choix[newIndex], choix[cIndex]];
    
    // Réorganiser les lettres
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    questions[qIndex].choix = choix.map((c, i) => `${letters[i]}) ${c.substring(3)}`);
    
    setQcmData({ ...qcmData, questions });
    setHasUnsavedChanges(true);
  };

  const toggleReponse = (qIndex: number, letter: string) => {
    if (!qcmData) return;
    const questions = [...qcmData.questions];
    const reps = questions[qIndex].reponses;
    const type = questions[qIndex].type;

    if (type === 'QRU') {
      // Pour QRU, une seule réponse possible
      questions[qIndex].reponses = [letter];
    } else {
      // Pour QRM, réponses multiples
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
    setQcmData({
      ...qcmData,
      questions: [
        ...qcmData.questions,
        {
          id,
          type: "QRU",
          contexte: "",
          question: "Nouvelle question ?",
          choix: ["A) Réponse 1", "B) Réponse 2", "C) Réponse 3"],
          reponses: ["A"],
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

    setQcmData({ ...qcmData, questions, total_questions: questions.length });
    setHasUnsavedChanges(true);
  };

  /* ===================== UI ===================== */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Chargement…</div>
      </div>
    );
  }

  if (!qcmData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">Erreur de chargement</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">

        {/* HEADER */}
        <div className="bg-white p-6 rounded-xl shadow mb-6 sticky top-4 z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => {
                  if (hasUnsavedChanges && !confirm('Vous avez des modifications non sauvegardées. Quitter quand même ?')) {
                    return;
                  }
                  router.push("/admin");
                }} 
                className="flex gap-2 text-blue-600 font-semibold hover:text-blue-700"
              >
                <ArrowLeft /> Retour
              </button>
              <div className="text-sm text-gray-600">
                {qcmData.matiere} - {qcmData.annee} ({qcmData.total_questions} questions)
              </div>
            </div>

            <div className="flex gap-3 items-center">
              {hasUnsavedChanges && !saveSuccess && (
                <div className="flex items-center gap-2 bg-yellow-100 text-yellow-700 px-3 py-2 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4" />
                  Non sauvegardé
                </div>
              )}
              {saveSuccess && (
                <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-2 rounded-lg">
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
                <Save className="w-5 h-5" /> {saving ? "Sauvegarde..." : "Sauvegarder"}
              </button>
            </div>
          </div>
        </div>

        {/* QUESTIONS */}
        <div className="space-y-6">
          {qcmData.questions.map((q, i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-md border-2 border-gray-100">
              
              {/* Header Question */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-xl text-blue-600">Q{q.id}</span>
                  <select
                    value={q.type}
                    onChange={(e) => updateQuestion(i, "type", e.target.value)}
                    className="border-2 rounded-lg px-3 py-1 text-sm font-semibold"
                  >
                    <option value="QRU">QRU (Réponse Unique)</option>
                    <option value="QRM">QRM (Réponses Multiples)</option>
                  </select>
                </div>
                <button 
                  onClick={() => deleteQuestion(i)} 
                  className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all"
                  title="Supprimer la question"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {/* Contexte */}
              <div className="mb-3">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Contexte clinique (optionnel)
                </label>
                <textarea
                  value={q.contexte || ''}
                  onChange={(e) => updateQuestion(i, "contexte", e.target.value)}
                  placeholder="Ex: Patient de 65 ans présentant une dyspnée..."
                  className="w-full border-2 border-gray-200 p-3 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                  rows={2}
                />
              </div>

              {/* Question */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Question
                </label>
                <textarea
                  value={q.question}
                  onChange={(e) => updateQuestion(i, "question", e.target.value)}
                  className="w-full border-2 border-gray-200 p-3 rounded-lg focus:border-blue-500 focus:outline-none font-medium"
                  rows={3}
                />
              </div>

              {/* Choix */}
              <div className="mb-3">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Choix de réponses (cliquez sur la lettre pour marquer comme correcte)
                </label>
                {q.choix.map((c, ci) => {
                  const letter = c.charAt(0);
                  const isCorrect = q.reponses.includes(letter);
                  
                  return (
                    <div key={ci} className="flex gap-2 mb-2 items-center group">
                      <button
                        onClick={() => toggleReponse(i, letter)}
                        className={`w-10 h-10 font-bold rounded-lg transition-all flex-shrink-0 ${
                          isCorrect 
                            ? "bg-green-500 text-white shadow-lg" 
                            : "bg-gray-200 hover:bg-gray-300"
                        }`}
                        title={isCorrect ? "Réponse correcte" : "Marquer comme correcte"}
                      >
                        {letter}
                      </button>
                      <input
                        value={c}
                        onChange={(e) => updateChoix(i, ci, e.target.value)}
                        className="flex-1 border-2 border-gray-200 p-2 rounded-lg focus:border-blue-500 focus:outline-none"
                      />
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => moveChoix(i, ci, 'up')}
                          disabled={ci === 0}
                          className="p-2 hover:bg-gray-100 rounded disabled:opacity-30"
                          title="Déplacer vers le haut"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveChoix(i, ci, 'down')}
                          disabled={ci === q.choix.length - 1}
                          className="p-2 hover:bg-gray-100 rounded disabled:opacity-30"
                          title="Déplacer vers le bas"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeChoix(i, ci)}
                          className="p-2 hover:bg-red-50 text-red-600 rounded"
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
                  className="text-sm text-blue-600 hover:text-blue-700 font-semibold mt-2 hover:underline"
                >
                  + Ajouter un choix
                </button>
              </div>

              {/* Réponses sélectionnées */}
              <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <span className="text-sm font-semibold text-green-800">
                  Réponse(s) correcte(s): {q.reponses.length > 0 ? q.reponses.join(', ') : 'Aucune'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
