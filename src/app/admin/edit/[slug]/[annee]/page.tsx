"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, Plus, Trash2, ArrowLeft, Check } from "lucide-react";

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
      const response = await fetch(`/data/qcm/${slug}_${annee}.json`);
      const data = await response.json();
      setQcmData(data);
    } catch (error) {
      console.error("Erreur chargement:", error);
    } finally {
      setLoading(false);
    }
  };

  /* ===================== SAVE ===================== */

  const handleSave = async () => {
    if (!qcmData) return;

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
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert("❌ Erreur : " + result.message);
      }
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      alert("Erreur lors de la sauvegarde");
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
  };

  const updateChoix = (qIndex: number, cIndex: number, value: string) => {
    if (!qcmData) return;
    const questions = [...qcmData.questions];
    questions[qIndex].choix[cIndex] = value;
    setQcmData({ ...qcmData, questions });
  };

  const addChoix = (qIndex: number) => {
    if (!qcmData) return;
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const questions = [...qcmData.questions];
    const next = letters[questions[qIndex].choix.length];
    questions[qIndex].choix.push(`${next}) Nouvelle réponse`);
    setQcmData({ ...qcmData, questions });
  };

  const removeChoix = (qIndex: number, cIndex: number) => {
    if (!qcmData) return;
    const questions = [...qcmData.questions];
    questions[qIndex].choix.splice(cIndex, 1);
    setQcmData({ ...qcmData, questions });
  };

  const toggleReponse = (qIndex: number, letter: string) => {
    if (!qcmData) return;
    const questions = [...qcmData.questions];
    const reps = questions[qIndex].reponses;

    questions[qIndex].reponses = reps.includes(letter)
      ? reps.filter((r) => r !== letter)
      : [...reps, letter];

    setQcmData({ ...qcmData, questions });
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
  };

  const deleteQuestion = (index: number) => {
    if (!qcmData) return;
    if (!confirm("Supprimer cette question ?")) return;

    const questions = qcmData.questions
      .filter((_, i) => i !== index)
      .map((q, i) => ({ ...q, id: i + 1 }));

    setQcmData({ ...qcmData, questions, total_questions: questions.length });
  };

  /* ===================== UI ===================== */

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement…</div>;
  }

  if (!qcmData) {
    return <div className="min-h-screen flex items-center justify-center">Erreur de chargement</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">

        {/* HEADER */}
        <div className="bg-white p-6 rounded-xl shadow mb-6 sticky top-4 z-10">
          <div className="flex justify-between items-center">
            <button onClick={() => router.push("/admin")} className="flex gap-2 text-blue-600 font-semibold">
              <ArrowLeft /> Retour
            </button>

            <div className="flex gap-3 items-center">
              {saveSuccess && (
                <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-2 rounded-lg">
                  <Check /> Sauvegardé
                </div>
              )}
              <button onClick={addQuestion} className="bg-green-500 text-white px-4 py-2 rounded-lg">
                <Plus /> Ajouter
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg"
              >
                <Save /> {saving ? "Sauvegarde..." : "Sauvegarder"}
              </button>
            </div>
          </div>
        </div>

        {/* QUESTIONS */}
        <div className="space-y-6">
          {qcmData.questions.map((q, i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow">
              <div className="flex justify-between mb-3">
                <span className="font-bold">Q{q.id}</span>
                <button onClick={() => deleteQuestion(i)} className="text-red-600">
                  <Trash2 />
                </button>
              </div>

              <textarea
                value={q.question}
                onChange={(e) => updateQuestion(i, "question", e.target.value)}
                className="w-full border p-3 rounded mb-3"
              />

              {q.choix.map((c, ci) => {
                const letter = c.charAt(0);
                return (
                  <div key={ci} className="flex gap-2 mb-2">
                    <button
                      onClick={() => toggleReponse(i, letter)}
                      className={`w-10 h-10 font-bold rounded ${
                        q.reponses.includes(letter) ? "bg-green-500 text-white" : "bg-gray-200"
                      }`}
                    >
                      {letter}
                    </button>
                    <input
                      value={c}
                      onChange={(e) => updateChoix(i, ci, e.target.value)}
                      className="flex-1 border p-2 rounded"
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
