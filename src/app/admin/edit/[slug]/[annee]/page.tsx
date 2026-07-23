"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  FolderPlus,
  ImagePlus,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import type {
  ExamData,
  ExamFolder,
  FolderType,
  Question,
  QuestionType,
} from "@/types/exam";
import { normalizeExamData } from "@/lib/exam/normalizeExam";

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "QRU", label: "QRU (Réponse Unique)" },
  { value: "QRM", label: "QRM (Réponses Multiples)" },
  { value: "QRP", label: "QRP (Réponse Précisée)" },
  { value: "QROC", label: "QROC (Réponse Ouverte Courte)" },
];

const FOLDER_TYPES: { value: FolderType; label: string }[] = [
  { value: "DP", label: "DP - Dossier progressif" },
  { value: "SQI", label: "sQI - Questions isolées" },
  { value: "KFP", label: "KFP - Key Features Problem" },
];

function createFolderId() {
  return `folder-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createDefaultChoices() {
  return ["A) ", "B) ", "C) ", "D) ", "E) "];
}

function sortFolders(folders: ExamFolder[]) {
  return [...folders].sort((a, b) => a.order - b.order);
}

function sortQuestions(questions: Question[]) {
  return [...questions].sort((a, b) => (a.order ?? a.id) - (b.order ?? b.id));
}

function countExamQuestions(examData: ExamData) {
  return examData.folders.reduce(
    (acc, folder) => acc + folder.questions.length,
    0
  );
}

function getAllQuestions(examData: ExamData) {
  return examData.folders.flatMap((folder) => folder.questions);
}

function remapLetters(letters: string[], letterMap: Map<string, string>) {
  return letters
    .map((letter) => letterMap.get(letter) ?? letter)
    .filter((letter): letter is string => letter !== undefined);
}

function getNextQuestionId(examData: ExamData) {
  const allQuestions = getAllQuestions(examData);
  const maxId = allQuestions.reduce(
    (max, question) => Math.max(max, question.id),
    0
  );

  return maxId + 1;
}

function getFolderTypeLabel(type: FolderType) {
  if (type === "DP") return "Dossier progressif";
  if (type === "SQI") return "Séquence de questions isolées";
  return "Key Features Problem";
}

function getAdminHeaders(extraHeaders: HeadersInit = {}) {
  const token = localStorage.getItem("admin_token");

  return {
    ...extraHeaders,
    Authorization: token ? `Bearer ${token}` : "",
  };
}

export default function EditQCMPage() {
  const params = useParams();
  const router = useRouter();

  const slug = params.slug as string;
  const annee = params.annee as string;

  const [examData, setExamData] = useState<ExamData | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [uploadingQuestionId, setUploadingQuestionId] = useState<number | null>(
    null
  );
  const [draggingQuestionId, setDraggingQuestionId] = useState<number | null>(
    null
  );

  useEffect(() => {
    const token = localStorage.getItem("admin_token");

    if (!token) {
      router.push("/admin/login");
      return;
    }

    async function loadQCM() {
      try {
        const draft = localStorage.getItem(`draft_${slug}_${annee}`);

        if (draft) {
          const useDraft = confirm(
            "Un brouillon non sauvegardé a été trouvé. Voulez-vous le reprendre ?"
          );

          if (useDraft) {
            const parsedDraft = JSON.parse(draft) as ExamData;
            const normalizedDraft = normalizeExamData(parsedDraft);

            setExamData(normalizedDraft);
            setActiveFolderId(normalizedDraft.folders[0]?.id || "");
            setHasUnsavedChanges(true);
            setLoading(false);
            return;
          }

          localStorage.removeItem(`draft_${slug}_${annee}`);
        }

        const response = await fetch(`/data/qcm/${slug}_${annee}.json`);
        const rawData = (await response.json()) as ExamData;
        const normalizedData = normalizeExamData(rawData);

        setExamData(normalizedData);
        setActiveFolderId(normalizedData.folders[0]?.id || "");
      } catch (error) {
        console.error("Erreur chargement:", error);
        alert("Erreur lors du chargement du QCM");
      } finally {
        setLoading(false);
      }
    }

    loadQCM();
  }, [slug, annee, router]);

  useEffect(() => {
    if (!examData || !hasUnsavedChanges) return;

    const autoSave = setInterval(() => {
      localStorage.setItem(`draft_${slug}_${annee}`, JSON.stringify(examData));
      console.log("📝 Brouillon sauvegardé localement");
    }, 30000);

    return () => clearInterval(autoSave);
  }, [examData, hasUnsavedChanges, slug, annee]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue =
          "Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter ?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const sortedFolders = useMemo(() => {
    if (!examData) return [];
    return sortFolders(examData.folders);
  }, [examData]);

  const activeFolder = useMemo(() => {
    return sortedFolders.find((folder) => folder.id === activeFolderId) || null;
  }, [sortedFolders, activeFolderId]);

  const updateExamData = (updater: (current: ExamData) => ExamData) => {
    setExamData((current) => {
      if (!current) return current;

      const next = updater(current);
      const totalQuestions = countExamQuestions(next);

      return {
        ...next,
        total_questions: totalQuestions,
      };
    });

    setHasUnsavedChanges(true);
    setSaveSuccess(false);
  };

  const validateExam = () => {
    if (!examData) return false;

    if (examData.folders.length === 0) {
      alert("❌ L'épreuve doit contenir au moins un dossier.");
      return false;
    }

    for (const folder of examData.folders) {
      if (!folder.title.trim()) {
        alert("❌ Un dossier n'a pas de nom.");
        return false;
      }

      if (folder.questions.length === 0) {
        alert(`❌ Le dossier "${folder.title}" ne contient aucune question.`);
        return false;
      }

      for (const question of folder.questions) {
        if (!question.question.trim()) {
          alert(`❌ Question ${question.id} : Le texte de la question est vide.`);
          return false;
        }

        if (question.type === "QROC") {
          if (question.reponses.filter((reponse) => reponse.trim()).length === 0) {
            alert(
              `❌ Question ${question.id} : Aucune réponse attendue définie pour la QROC.`
            );
            return false;
          }

          continue;
        }

        if (question.choix.length < 2) {
          alert(
            `❌ Question ${question.id} : Il faut au moins 2 choix de réponse.`
          );
          return false;
        }

        if (question.reponses.length === 0) {
          alert(`❌ Question ${question.id} : Aucune réponse correcte définie.`);
          return false;
        }

        for (const reponse of question.reponses) {
          const exists = question.choix.some((choice) =>
            choice.startsWith(`${reponse})`)
          );

          if (!exists) {
            alert(
              `❌ Question ${question.id} : La réponse "${reponse}" n'existe pas dans les choix.`
            );
            return false;
          }
        }

        if (question.type === "QRP") {
          if (!question.maxReponses || question.maxReponses < 1) {
            alert(
              `❌ Question ${question.id} : QRP sans nombre de réponses max.`
            );
            return false;
          }

          if (question.maxReponses > question.choix.length) {
            alert(
              `❌ Question ${question.id} : maxReponses est supérieur au nombre de choix.`
            );
            return false;
          }
        }
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!examData) return;
    if (!validateExam()) return;

    setSaving(true);

    try {
      const dataToSave: ExamData = {
        ...examData,
        folders: sortFolders(examData.folders).map((folder, folderIndex) => ({
          ...folder,
          order: folderIndex + 1,
          questions: sortQuestions(folder.questions).map(
            (question, questionIndex) => ({
              ...question,
              order: questionIndex + 1,
              reponses:
                question.type === "QROC"
                  ? question.reponses
                      .map((reponse) => reponse.trim())
                      .filter(Boolean)
                  : question.reponses,
            })
          ),
        })),
        total_questions: countExamQuestions(examData),
      };

      const response = await fetch("/api/qcm/save", {
        method: "POST",
        headers: getAdminHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ matiere: slug, annee, qcmData: dataToSave }),
      });

      const result = (await response.json()) as {
        success: boolean;
        message?: string;
      };

      if (result.success) {
        setExamData(dataToSave);
        setSaveSuccess(true);
        setHasUnsavedChanges(false);
        localStorage.removeItem(`draft_${slug}_${annee}`);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert("❌ Erreur : " + (result.message || "Erreur inconnue"));
      }
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      alert("❌ Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const addFolder = () => {
    updateExamData((current) => {
      const nextOrder = current.folders.length + 1;

      const newFolder: ExamFolder = {
        id: createFolderId(),
        type: "SQI",
        title: `Dossier ${nextOrder}`,
        description: "",
        order: nextOrder,
        questions: [],
      };

      setActiveFolderId(newFolder.id);

      return {
        ...current,
        folders: [...current.folders, newFolder],
      };
    });
  };

  const deleteFolder = (folderId: string) => {
    if (!examData) return;

    const folder = examData.folders.find((item) => item.id === folderId);
    if (!folder) return;

    if (
      !confirm(
        `⚠️ Supprimer le dossier "${folder.title}" et toutes ses questions ?`
      )
    ) {
      return;
    }

    updateExamData((current) => {
      const remainingFolders = current.folders
        .filter((item) => item.id !== folderId)
        .map((item, index) => ({ ...item, order: index + 1 }));

      if (activeFolderId === folderId) {
        setActiveFolderId(remainingFolders[0]?.id || "");
      }

      return {
        ...current,
        folders: remainingFolders,
      };
    });
  };

  const moveFolder = (folderId: string, direction: "up" | "down") => {
    updateExamData((current) => {
      const folders = sortFolders(current.folders);
      const index = folders.findIndex((folder) => folder.id === folderId);
      const newIndex = direction === "up" ? index - 1 : index + 1;

      if (index < 0 || newIndex < 0 || newIndex >= folders.length) {
        return current;
      }

      [folders[index], folders[newIndex]] = [folders[newIndex], folders[index]];

      return {
        ...current,
        folders: folders.map((folder, folderIndex) => ({
          ...folder,
          order: folderIndex + 1,
        })),
      };
    });
  };

  const updateFolder = <K extends keyof ExamFolder>(
    folderId: string,
    field: K,
    value: ExamFolder[K]
  ) => {
    updateExamData((current) => ({
      ...current,
      folders: current.folders.map((folder) =>
        folder.id === folderId ? { ...folder, [field]: value } : folder
      ),
    }));
  };

  const addQuestion = (folderId: string) => {
    if (!examData) return;

    updateExamData((current) => {
      const nextQuestionId = getNextQuestionId(current);

      return {
        ...current,
        folders: current.folders.map((folder) => {
          if (folder.id !== folderId) return folder;

          const newQuestion: Question = {
            id: nextQuestionId,
            type: "QRM",
            contexte: "",
            question: "",
            choix: createDefaultChoices(),
            reponses: [],
            maxReponses: 3,
            correctionExplanation: "",
            order: folder.questions.length + 1,
          };

          return {
            ...folder,
            questions: [...folder.questions, newQuestion],
          };
        }),
      };
    });
  };

  const deleteQuestion = (folderId: string, questionId: number) => {
    if (!confirm("⚠️ Supprimer cette question définitivement ?")) return;

    updateExamData((current) => ({
      ...current,
      folders: current.folders.map((folder) => {
        if (folder.id !== folderId) return folder;

        const questions = folder.questions
          .filter((question) => question.id !== questionId)
          .map((question, index) => ({
            ...question,
            order: index + 1,
          }));

        return {
          ...folder,
          questions,
        };
      }),
    }));
  };

  const moveQuestion = (
    folderId: string,
    questionId: number,
    direction: "up" | "down"
  ) => {
    updateExamData((current) => ({
      ...current,
      folders: current.folders.map((folder) => {
        if (folder.id !== folderId) return folder;

        const questions = sortQuestions(folder.questions);
        const index = questions.findIndex(
          (question) => question.id === questionId
        );
        const newIndex = direction === "up" ? index - 1 : index + 1;

        if (index < 0 || newIndex < 0 || newIndex >= questions.length) {
          return folder;
        }

        [questions[index], questions[newIndex]] = [
          questions[newIndex],
          questions[index],
        ];

        return {
          ...folder,
          questions: questions.map((question, questionIndex) => ({
            ...question,
            order: questionIndex + 1,
          })),
        };
      }),
    }));
  };

  const updateQuestion = <K extends keyof Question>(
    folderId: string,
    questionId: number,
    field: K,
    value: Question[K]
  ) => {
    updateExamData((current) => ({
      ...current,
      folders: current.folders.map((folder) => {
        if (folder.id !== folderId) return folder;

        return {
          ...folder,
          questions: folder.questions.map((question) =>
            question.id === questionId
              ? {
                  ...question,
                  [field]: value,
                }
              : question
          ),
        };
      }),
    }));
  };

  const setQrocResponseAt = (
    folderId: string,
    questionId: number,
    index: number,
    value: string
  ) => {
    updateExamData((current) => ({
      ...current,
      folders: current.folders.map((folder) => {
        if (folder.id !== folderId) return folder;

        return {
          ...folder,
          questions: folder.questions.map((question) => {
            if (question.id !== questionId) return question;

            const reponses = [...question.reponses];
            reponses[index] = value;

            return { ...question, reponses };
          }),
        };
      }),
    }));
  };

  const addQrocResponse = (folderId: string, questionId: number) => {
    updateExamData((current) => ({
      ...current,
      folders: current.folders.map((folder) => {
        if (folder.id !== folderId) return folder;

        return {
          ...folder,
          questions: folder.questions.map((question) =>
            question.id === questionId
              ? { ...question, reponses: [...question.reponses, ""] }
              : question
          ),
        };
      }),
    }));
  };

  const removeQrocResponse = (
    folderId: string,
    questionId: number,
    index: number
  ) => {
    updateExamData((current) => ({
      ...current,
      folders: current.folders.map((folder) => {
        if (folder.id !== folderId) return folder;

        return {
          ...folder,
          questions: folder.questions.map((question) =>
            question.id === questionId
              ? {
                  ...question,
                  reponses: question.reponses.filter((_, i) => i !== index),
                }
              : question
          ),
        };
      }),
    }));
  };

  const updateQuestionType = (
    folderId: string,
    questionId: number,
    type: QuestionType
  ) => {
    updateExamData((current) => ({
      ...current,
      folders: current.folders.map((folder) => {
        if (folder.id !== folderId) return folder;

        return {
          ...folder,
          questions: folder.questions.map((question) => {
            if (question.id !== questionId) return question;

            if (type === "QROC") {
              return {
                ...question,
                type,
                choix: [],
                reponses: [],
                maxReponses: undefined,
              };
            }

            return {
              ...question,
              type,
              choix:
                question.choix.length > 0
                  ? question.choix
                  : createDefaultChoices(),
              reponses: [],
              maxReponses: type === "QRP" ? question.maxReponses || 3 : undefined,
            };
          }),
        };
      }),
    }));
  };

  const updateChoice = (
    folderId: string,
    questionId: number,
    choiceIndex: number,
    value: string
  ) => {
    updateExamData((current) => ({
      ...current,
      folders: current.folders.map((folder) => {
        if (folder.id !== folderId) return folder;

        return {
          ...folder,
          questions: folder.questions.map((question) => {
            if (question.id !== questionId) return question;

            const choices = [...question.choix];
            choices[choiceIndex] = value;

            return {
              ...question,
              choix: choices,
            };
          }),
        };
      }),
    }));
  };

  const addChoice = (folderId: string, questionId: number) => {
    updateExamData((current) => ({
      ...current,
      folders: current.folders.map((folder) => {
        if (folder.id !== folderId) return folder;

        return {
          ...folder,
          questions: folder.questions.map((question) => {
            if (question.id !== questionId) return question;

            const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            const nextLetter = letters[question.choix.length];

            if (!nextLetter) {
              alert("Maximum 26 choix atteint");
              return question;
            }

            return {
              ...question,
              choix: [...question.choix, `${nextLetter}) `],
            };
          }),
        };
      }),
    }));
  };

  const removeChoice = (
    folderId: string,
    questionId: number,
    choiceIndex: number
  ) => {
    updateExamData((current) => ({
      ...current,
      folders: current.folders.map((folder) => {
        if (folder.id !== folderId) return folder;

        return {
          ...folder,
          questions: folder.questions.map((question) => {
            if (question.id !== questionId) return question;

            if (question.choix.length <= 2) {
              alert("Il faut au moins 2 choix.");
              return question;
            }

            const removedLetter = question.choix[choiceIndex].charAt(0);
            const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

            const survivingChoices = question.choix.filter(
              (_, index) => index !== choiceIndex
            );

            const letterMap = new Map<string, string>();
            survivingChoices.forEach((choice, newIndex) => {
              letterMap.set(choice.charAt(0), letters[newIndex]);
            });

            const choices = survivingChoices.map(
              (choice, index) => `${letters[index]}) ${choice.slice(3)}`
            );

            return {
              ...question,
              choix: choices,
              reponses: remapLetters(
                question.reponses.filter((reponse) => reponse !== removedLetter),
                letterMap
              ),
              critiques: question.critiques
                ? remapLetters(
                    question.critiques.filter(
                      (letter) => letter !== removedLetter
                    ),
                    letterMap
                  )
                : question.critiques,
            };
          }),
        };
      }),
    }));
  };

  const moveChoice = (
    folderId: string,
    questionId: number,
    choiceIndex: number,
    direction: "up" | "down"
  ) => {
    updateExamData((current) => ({
      ...current,
      folders: current.folders.map((folder) => {
        if (folder.id !== folderId) return folder;

        return {
          ...folder,
          questions: folder.questions.map((question) => {
            if (question.id !== questionId) return question;

            const choices = [...question.choix];
            const newIndex = direction === "up" ? choiceIndex - 1 : choiceIndex + 1;

            if (newIndex < 0 || newIndex >= choices.length) {
              return question;
            }

            [choices[choiceIndex], choices[newIndex]] = [
              choices[newIndex],
              choices[choiceIndex],
            ];

            const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            const normalizedChoices = choices.map(
              (choice, index) => `${letters[index]}) ${choice.slice(3)}`
            );

            const letterAtChoiceIndex = letters[choiceIndex];
            const letterAtNewIndex = letters[newIndex];
            const letterMap = new Map<string, string>([
              [letterAtChoiceIndex, letterAtNewIndex],
              [letterAtNewIndex, letterAtChoiceIndex],
            ]);

            return {
              ...question,
              choix: normalizedChoices,
              reponses: remapLetters(question.reponses, letterMap),
              critiques: question.critiques
                ? remapLetters(question.critiques, letterMap)
                : question.critiques,
            };
          }),
        };
      }),
    }));
  };

  const toggleAnswer = (folderId: string, questionId: number, letter: string) => {
    updateExamData((current) => ({
      ...current,
      folders: current.folders.map((folder) => {
        if (folder.id !== folderId) return folder;

        return {
          ...folder,
          questions: folder.questions.map((question) => {
            if (question.id !== questionId) return question;

            if (question.type === "QROC") return question;

            if (question.type === "QRU") {
              return {
                ...question,
                reponses: [letter],
              };
            }

            const exists = question.reponses.includes(letter);

            return {
              ...question,
              reponses: exists
                ? question.reponses.filter((reponse) => reponse !== letter)
                : [...question.reponses, letter].sort(),
            };
          }),
        };
      }),
    }));
  };

  const toggleCritique = (
    folderId: string,
    questionId: number,
    letter: string
  ) => {
    updateExamData((current) => ({
      ...current,
      folders: current.folders.map((folder) => {
        if (folder.id !== folderId) return folder;

        return {
          ...folder,
          questions: folder.questions.map((question) => {
            if (question.id !== questionId) return question;
            if (question.type === "QROC") return question;

            const critiques = question.critiques ?? [];
            const exists = critiques.includes(letter);

            return {
              ...question,
              critiques: exists
                ? critiques.filter((reponse) => reponse !== letter)
                : [...critiques, letter].sort(),
            };
          }),
        };
      }),
    }));
  };

  const handleImageUpload = async (
    folderId: string,
    questionId: number,
    file: File
  ) => {
    setUploadingQuestionId(questionId);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("slug", slug);
      formData.append("annee", annee);
      formData.append("questionId", String(questionId));

      const response = await fetch("/api/qcm/upload-image", {
        method: "POST",
        headers: getAdminHeaders(),
        body: formData,
      });

      const result = (await response.json()) as {
        success: boolean;
        path?: string;
        message?: string;
      };

      if (result.success && result.path) {
        updateQuestion(folderId, questionId, "image", result.path);
      } else {
        alert("❌ Erreur upload : " + (result.message || "Erreur inconnue"));
      }
    } catch (error) {
      console.error("Erreur upload image:", error);
      alert("❌ Erreur lors de l'upload");
    } finally {
      setUploadingQuestionId(null);
    }
  };

  const handleImageDelete = async (folderId: string, question: Question) => {
    if (!question.image) return;
    if (!confirm("Supprimer l'image de cette question ?")) return;

    try {
      await fetch("/api/qcm/delete-image", {
        method: "POST",
        headers: getAdminHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ imagePath: question.image }),
      });
    } catch {}

    updateQuestion(folderId, question.id, "image", undefined);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-xl text-gray-800 dark:text-gray-100">
          Chargement…
        </div>
      </div>
    );
  }

  if (!examData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-xl text-red-600">Erreur de chargement</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 text-gray-900 dark:text-gray-100">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow mb-6 sticky top-4 z-20 border border-gray-100 dark:border-gray-800">
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (
                    hasUnsavedChanges &&
                    !confirm(
                      "Vous avez des modifications non sauvegardées. Quitter quand même ?"
                    )
                  ) {
                    return;
                  }

                  router.push("/admin");
                }}
                className="flex gap-2 text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700 dark:hover:text-blue-300"
              >
                <ArrowLeft className="w-5 h-5" />
                Retour
              </button>

              <div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {examData.matiere} - {examData.annee}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {examData.folders.length} dossier(s) •{" "}
                  {examData.total_questions} question(s)
                </div>
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
                  <Check className="w-5 h-5" />
                  Sauvegardé
                </div>
              )}

              <button
                onClick={addFolder}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-all flex items-center gap-2"
              >
                <FolderPlus className="w-5 h-5" />
                Ajouter un dossier
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {saving ? "Sauvegarde..." : "Sauvegarder"}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 min-w-0">
          <aside className="min-w-0 bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 p-5 h-fit lg:sticky lg:top-28">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-extrabold text-xl">Dossiers</h2>
              <button
                onClick={addFolder}
                className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50"
                title="Ajouter un dossier"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {sortedFolders.map((folder, index) => (
                <div
                  key={folder.id}
                  className={`rounded-xl border p-3 transition ${
                    folder.id === activeFolderId
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                  }`}
                >
                  <button
                    onClick={() => setActiveFolderId(folder.id)}
                    className="w-full text-left"
                  >
                    <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">
                      {folder.type} • {getFolderTypeLabel(folder.type)}
                    </div>

                    <div className="font-bold text-gray-900 dark:text-gray-100 line-clamp-2">
                      {folder.title}
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {folder.questions.length} question(s)
                    </div>
                  </button>

                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => moveFolder(folder.id, "up")}
                      disabled={index === 0}
                      className="p-2 rounded-lg hover:bg-white dark:hover:bg-gray-800 disabled:opacity-30"
                      title="Monter"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => moveFolder(folder.id, "down")}
                      disabled={index === sortedFolders.length - 1}
                      className="p-2 rounded-lg hover:bg-white dark:hover:bg-gray-800 disabled:opacity-30"
                      title="Descendre"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => deleteFolder(folder.id)}
                      className="ml-auto p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {sortedFolders.length === 0 && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Aucun dossier pour le moment.
                </div>
              )}
            </div>
          </aside>

          <main className="min-w-0">
            {!activeFolder ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 p-8 text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h2 className="text-2xl font-bold mb-2">
                  Aucun dossier sélectionné
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Créez un dossier pour commencer à ajouter des questions.
                </p>
                <button
                  onClick={addFolder}
                  className="inline-flex items-center gap-2 bg-purple-600 text-white px-5 py-3 rounded-xl hover:bg-purple-700 font-semibold"
                >
                  <FolderPlus className="w-5 h-5" />
                  Créer un dossier
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 p-6">
                  <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
                    <div>
                      <h1 className="text-2xl font-extrabold mb-1">
                        Configuration du dossier
                      </h1>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Type, nom, consigne générale et questions liées.
                      </p>
                    </div>

                    <button
                      onClick={() => addQuestion(activeFolder.id)}
                      className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 font-semibold"
                    >
                      <Plus className="w-5 h-5" />
                      Ajouter une question
                    </button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                        Type de dossier
                      </label>
                      <select
                        value={activeFolder.type}
                        onChange={(event) =>
                          updateFolder(
                            activeFolder.id,
                            "type",
                            event.target.value as FolderType
                          )
                        }
                        className="w-full border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2"
                      >
                        {FOLDER_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                        Nom du dossier
                      </label>
                      <input
                        value={activeFolder.title}
                        onChange={(event) =>
                          updateFolder(
                            activeFolder.id,
                            "title",
                            event.target.value
                          )
                        }
                        className="w-full border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2"
                        placeholder="Ex: DP1 Cardiologie - Madame B."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      Consigne générale du dossier
                    </label>
                    <textarea
                      value={activeFolder.description || ""}
                      onChange={(event) =>
                        updateFolder(
                          activeFolder.id,
                          "description",
                          event.target.value
                        )
                      }
                      className="w-full border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2"
                      rows={4}
                      placeholder="Texte introductif, contexte global, consigne du dossier..."
                    />
                  </div>
                </section>

                <section className="space-y-6">
                  {sortQuestions(activeFolder.questions).map((question, index) => (
                    <div
                      key={question.id}
                      className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-md border-2 border-gray-100 dark:border-gray-800"
                    >
                      <div className="flex flex-wrap justify-between items-start gap-4 mb-5">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-bold text-xl text-blue-600">
                            Q{index + 1}
                          </span>

                          <select
                            value={question.type}
                            onChange={(event) =>
                              updateQuestionType(
                                activeFolder.id,
                                question.id,
                                event.target.value as QuestionType
                              )
                            }
                            className="border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-1 text-sm font-semibold"
                          >
                            {QUESTION_TYPES.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>

                          {question.type === "QRP" && (
                            <input
                              type="number"
                              min={1}
                              max={question.choix.length || 5}
                              value={question.maxReponses ?? 3}
                              onChange={(event) =>
                                updateQuestion(
                                  activeFolder.id,
                                  question.id,
                                  "maxReponses",
                                  Number(event.target.value)
                                )
                              }
                              className="w-20 border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-2 py-1 text-sm"
                              title="Nombre de réponses à cocher"
                            />
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              moveQuestion(activeFolder.id, question.id, "up")
                            }
                            disabled={index === 0}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-30"
                            title="Monter"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() =>
                              moveQuestion(activeFolder.id, question.id, "down")
                            }
                            disabled={index === activeFolder.questions.length - 1}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-30"
                            title="Descendre"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() =>
                              deleteQuestion(activeFolder.id, question.id)
                            }
                            className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-all"
                            title="Supprimer la question"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                          Contexte clinique de la question
                        </label>
                        <textarea
                          value={question.contexte || ""}
                          onChange={(event) =>
                            updateQuestion(
                              activeFolder.id,
                              question.id,
                              "contexte",
                              event.target.value
                            )
                          }
                          placeholder="Ex: Patient de 65 ans présentant une dyspnée..."
                          className="w-full border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-3 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                          rows={2}
                        />
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                          Question
                        </label>
                        <textarea
                          value={question.question}
                          onChange={(event) =>
                            updateQuestion(
                              activeFolder.id,
                              question.id,
                              "question",
                              event.target.value
                            )
                          }
                          className="w-full border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-3 rounded-lg focus:border-blue-500 focus:outline-none font-medium"
                          rows={3}
                        />
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                          Image optionnelle
                        </label>

                        {question.image ? (
                          <div className="relative inline-block">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={question.image}
                              alt={`Image Q${question.id}`}
                              className="max-h-48 rounded-lg border-2 border-gray-200 dark:border-gray-700 object-contain bg-gray-50 dark:bg-gray-800"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                                const placeholder =
                                  event.currentTarget.nextElementSibling as HTMLElement | null;
                                if (placeholder) placeholder.style.display = "flex";
                              }}
                            />
                            <div
                              className="hidden max-h-48 w-64 items-center justify-center rounded-lg border-2 border-dashed border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-xs font-semibold p-4 text-center"
                              style={{ display: "none" }}
                            >
                              Image indisponible sur le serveur
                            </div>

                            <button
                              onClick={() =>
                                handleImageDelete(activeFolder.id, question)
                              }
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-md"
                              title="Supprimer l'image"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label
                            onDragOver={(event) => {
                              event.preventDefault();
                              setDraggingQuestionId(question.id);
                            }}
                            onDragLeave={() =>
                              setDraggingQuestionId((current) =>
                                current === question.id ? null : current
                              )
                            }
                            onDrop={(event) => {
                              event.preventDefault();
                              setDraggingQuestionId(null);

                              const file = event.dataTransfer.files?.[0];

                              if (file) {
                                handleImageUpload(
                                  activeFolder.id,
                                  question.id,
                                  file
                                );
                              }
                            }}
                            className={`flex items-center gap-3 cursor-pointer w-fit border-2 border-dashed transition-all px-5 py-3 rounded-xl ${
                              draggingQuestionId === question.id
                                ? "border-blue-500 bg-blue-100 dark:bg-blue-900/40"
                                : "bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            }`}
                          >
                            {uploadingQuestionId === question.id ? (
                              <span className="text-sm text-gray-500 dark:text-gray-300">
                                Upload en cours...
                              </span>
                            ) : (
                              <>
                                <ImagePlus className="w-5 h-5 text-gray-400" />
                                <span className="text-sm text-gray-500 dark:text-gray-300 font-medium">
                                  {draggingQuestionId === question.id
                                    ? "Déposez l'image ici"
                                    : "Ajouter une image (ou glisser-déposer)"}
                                </span>
                              </>
                            )}

                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingQuestionId === question.id}
                              onChange={(event) => {
                                const file = event.target.files?.[0];

                                if (file) {
                                  handleImageUpload(
                                    activeFolder.id,
                                    question.id,
                                    file
                                  );
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>

                      {question.type !== "QROC" && (
                        <div className="mb-4">
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                            Choix de réponses
                          </label>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            Le bouton <ShieldAlert className="inline w-3.5 h-3.5 -mt-0.5" /> marque
                            un choix &quot;critique&quot; : indispensable si c&apos;est une
                            bonne réponse (non cochée par l&apos;étudiant ⇒ note à
                            0), inacceptable si c&apos;est une mauvaise réponse
                            (cochée par l&apos;étudiant ⇒ note à 0).
                          </p>

                          {question.choix.map((choice, choiceIndex) => {
                            const letter = choice.charAt(0);
                            const isCorrect = question.reponses.includes(letter);
                            const isCritique = (question.critiques ?? []).includes(
                              letter
                            );

                            return (
                              <div
                                key={`${question.id}-${choiceIndex}`}
                                className="flex flex-wrap gap-2 mb-2 items-center group"
                              >
                                <button
                                  onClick={() =>
                                    toggleAnswer(
                                      activeFolder.id,
                                      question.id,
                                      letter
                                    )
                                  }
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

                                <button
                                  onClick={() =>
                                    toggleCritique(
                                      activeFolder.id,
                                      question.id,
                                      letter
                                    )
                                  }
                                  className={`w-10 h-10 rounded-lg transition-all flex-shrink-0 flex items-center justify-center ${
                                    isCritique
                                      ? "bg-amber-500 text-white shadow-lg ring-2 ring-amber-300"
                                      : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
                                  }`}
                                  title={
                                    isCritique
                                      ? isCorrect
                                        ? "Réponse indispensable (désactiver)"
                                        : "Réponse inacceptable (désactiver)"
                                      : isCorrect
                                      ? "Marquer comme indispensable"
                                      : "Marquer comme inacceptable"
                                  }
                                >
                                  <ShieldAlert className="w-4 h-4" />
                                </button>

                                <input
                                  value={choice}
                                  onChange={(event) =>
                                    updateChoice(
                                      activeFolder.id,
                                      question.id,
                                      choiceIndex,
                                      event.target.value
                                    )
                                  }
                                  className="min-w-[140px] flex-1 border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-2 rounded-lg focus:border-blue-500 focus:outline-none"
                                />

                                <div className="flex basis-full justify-end gap-1 opacity-60 group-hover:opacity-100 sm:basis-auto sm:justify-start sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() =>
                                      moveChoice(
                                        activeFolder.id,
                                        question.id,
                                        choiceIndex,
                                        "up"
                                      )
                                    }
                                    disabled={choiceIndex === 0}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-30"
                                    title="Déplacer vers le haut"
                                  >
                                    <ChevronUp className="w-4 h-4" />
                                  </button>

                                  <button
                                    onClick={() =>
                                      moveChoice(
                                        activeFolder.id,
                                        question.id,
                                        choiceIndex,
                                        "down"
                                      )
                                    }
                                    disabled={
                                      choiceIndex === question.choix.length - 1
                                    }
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-30"
                                    title="Déplacer vers le bas"
                                  >
                                    <ChevronDown className="w-4 h-4" />
                                  </button>

                                  <button
                                    onClick={() =>
                                      removeChoice(
                                        activeFolder.id,
                                        question.id,
                                        choiceIndex
                                      )
                                    }
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
                            onClick={() =>
                              addChoice(activeFolder.id, question.id)
                            }
                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold mt-2 hover:underline"
                          >
                            + Ajouter un choix
                          </button>
                        </div>
                      )}

                      {question.type === "QROC" && (
                        <div className="mb-4">
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                            Réponses acceptées QROC
                          </label>

                          <div className="space-y-2">
                            {question.reponses.map((reponse, reponseIndex) => (
                              <div
                                key={`${question.id}-qroc-${reponseIndex}`}
                                className="flex gap-2 items-center"
                              >
                                <input
                                  type="text"
                                  value={reponse}
                                  onChange={(event) =>
                                    setQrocResponseAt(
                                      activeFolder.id,
                                      question.id,
                                      reponseIndex,
                                      event.target.value
                                    )
                                  }
                                  className="flex-1 border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-2 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                                  placeholder="ex: rétrécissement aortique"
                                />

                                <button
                                  onClick={() =>
                                    removeQrocResponse(
                                      activeFolder.id,
                                      question.id,
                                      reponseIndex
                                    )
                                  }
                                  className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 rounded"
                                  title="Supprimer cette réponse"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>

                          <button
                            onClick={() =>
                              addQrocResponse(activeFolder.id, question.id)
                            }
                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold mt-2 hover:underline"
                          >
                            + Ajouter une réponse acceptée
                          </button>

                          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            La comparaison est insensible aux majuscules,
                            espaces et accents côté étudiant. Ajoutez une
                            entrée par formulation équivalente acceptée.
                          </p>
                        </div>
                      )}

                      <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                          Justification / commentaire de correction
                        </label>
                        <textarea
                          value={question.correctionExplanation || ""}
                          onChange={(event) =>
                            updateQuestion(
                              activeFolder.id,
                              question.id,
                              "correctionExplanation",
                              event.target.value
                            )
                          }
                          className="w-full border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-3 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                          rows={3}
                          placeholder="Expliquez pourquoi les réponses sont justes/fausses..."
                        />
                      </div>

                      <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-600">
                        <span className="text-sm font-semibold text-green-800 dark:text-green-200">
                          Réponse(s) correcte(s) :{" "}
                          {question.reponses.length > 0
                            ? question.reponses.join(", ")
                            : "Aucune"}
                        </span>

                        {question.type === "QRP" && question.maxReponses && (
                          <span className="ml-3 text-xs text-green-700 dark:text-green-300">
                            (QRP : {question.maxReponses} réponses attendues)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {activeFolder.questions.length === 0 && (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 p-8 text-center">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <h2 className="text-xl font-bold mb-2">
                        Aucune question dans ce dossier
                      </h2>
                      <p className="text-gray-600 dark:text-gray-300 mb-6">
                        Ajoutez une question pour commencer à construire ce
                        dossier.
                      </p>
                      <button
                        onClick={() => addQuestion(activeFolder.id)}
                        className="inline-flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-xl hover:bg-green-700 font-semibold"
                      >
                        <Plus className="w-5 h-5" />
                        Ajouter une question
                      </button>
                    </div>
                  )}
                </section>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
