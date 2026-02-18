"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Question {
  id: number;
  type: string; // "QRU" | "QRM" | "QRP" | "QROC"
  contexte?: string;
  question: string;
  choix: string[];
  reponses: string[]; // pour QROC : banque de réponses texte
  image?: string;
  maxReponses?: number; // pour QRP
}

interface QCMData {
  matiere: string;
  annee: number;
  total_questions: number;
  questions: Question[];
}

type UserAnswers = {
  [key: number]: string[] | string; // array pour QCM, string pour QROC
};

export default function QCMPage() {
  const params = useParams();
  const router = useRouter();
  const matiere = params.matiere as string;
  const annee = params.annee as string;

  const [qcmData, setQcmData] = useState<QCMData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswers>({});
  const [showResults, setShowResults] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);

  useEffect(() => {
    async function loadQCM() {
      try {
        const response = await fetch(`/data/qcm/${matiere}_${annee}.json`);
        const data = await response.json();
        setQcmData(data);
      } catch (error) {
        console.error("Erreur chargement QCM:", error);
      }
    }
    loadQCM();
  }, [matiere, annee]);

  if (!qcmData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-gray-900 dark:text-gray-100">
        <div className="text-2xl">Chargement...</div>
      </div>
    );
  }

  const currentQuestion = qcmData.questions[currentIndex];
  const totalQuestions = qcmData.questions.length;

  const handleAnswerSelect = (choice: string) => {
    const questionId = currentQuestion.id;
    const type = currentQuestion.type;

    // QROC : on ne clique pas sur des choix
    if (type === "QROC") return;

    const current = userAnswers[questionId] as string[] | undefined;
    const currentAnswers = current || [];

    if (type === "QRU") {
      setUserAnswers({ ...userAnswers, [questionId]: [choice] });
    } else if (type === "QRP") {
      const max = currentQuestion.maxReponses || 3;
      if (currentAnswers.includes(choice)) {
        setUserAnswers({
          ...userAnswers,
          [questionId]: currentAnswers.filter((c) => c !== choice),
        });
      } else {
        if (currentAnswers.length >= max) {
          // on n'ajoute pas au-delà du max
          return;
        }
        setUserAnswers({
          ...userAnswers,
          [questionId]: [...currentAnswers, choice],
        });
      }
    } else {
      // QRM
      if (currentAnswers.includes(choice)) {
        setUserAnswers({
          ...userAnswers,
          [questionId]: currentAnswers.filter((c) => c !== choice),
        });
      } else {
        setUserAnswers({
          ...userAnswers,
          [questionId]: [...currentAnswers, choice],
        });
      }
    }
  };

  const handleQROCChange = (value: string) => {
    const questionId = currentQuestion.id;
    setUserAnswers({
      ...userAnswers,
      [questionId]: value,
    });
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowCorrection(false);
    } else {
      calculateResults();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowCorrection(false);
    }
  };

  // nouveau barème numérique
  const getQuestionScore = (
    q: Question,
    ans: string[] | string | undefined
  ): number => {
    // QROC : vrai / faux
    if (q.type === "QROC") {
      const userText = (ans as string | undefined) || "";
      const normalized = userText.trim().toLowerCase();
      if (!normalized) return 0;
      const ok = q.reponses.some(
        (r) => r.trim().toLowerCase() === normalized
      );
      return ok ? 1 : 0;
    }

    const userArr = ((ans as string[]) || []).slice().sort();
    const correctArr = [...q.reponses].sort();

    // QRU : vrai / faux
    if (q.type === "QRU") {
      return JSON.stringify(userArr) === JSON.stringify(correctArr) ? 1 : 0;
    }

    // QRP : somme des bonnes réponses cochées, réparties sur 1
    if (q.type === "QRP") {
      if (correctArr.length === 0) return 0;
      const pointsPerGood = 1 / correctArr.length;
      const goodSelected = userArr.filter((l) =>
        correctArr.includes(l)
      ).length;
      return pointsPerGood * goodSelected;
    }

    // QRM : barème par fautes/discordances
    const correctSet = new Set(correctArr);
    const selectedSet = new Set(userArr);

    let fautes = 0;

    // bonnes non cochées
    for (const c of correctSet) {
      if (!selectedSet.has(c)) fautes++;
    }
    // mauvaises cochées
    for (const s of selectedSet) {
      if (!correctSet.has(s)) fautes++;
    }

    if (fautes === 0) return 1;
    if (fautes === 1) return 0.5;
    if (fautes === 2) return 0.2;
    return 0;
  };

  const calculateResults = () => {
    const totalScore = qcmData.questions.reduce((acc, q) => {
      const ans = userAnswers[q.id];
      return acc + getQuestionScore(q, ans);
    }, 0);

    const moyenne = totalScore / totalQuestions; // 0–1

    const result = {
      matiere: qcmData.matiere,
      annee: qcmData.annee,
      score: moyenne * 100, // stocké en %
      total: 100,
      date: new Date().toISOString(),
    };

    const history = JSON.parse(localStorage.getItem("qcm_history") || "[]");
    history.push(result);
    localStorage.setItem("qcm_history", JSON.stringify(history));

    setShowResults(true);
  };

  if (showResults) {
    const totalScore = qcmData.questions.reduce((acc, q) => {
      const ans = userAnswers[q.id];
      return acc + getQuestionScore(q, ans);
    }, 0);

    const moyenne = totalScore / totalQuestions; // 0–1
    const percentage = Math.round(moyenne * 100);

    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-gray-900 dark:text-gray-100">
        {/* Résumé global de l'épreuve */}
        <div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-lg text-center mb-8 border border-gray-100 dark:border-gray-800">
          <h1 className="text-4xl font-bold mb-3">
            Résultats de l&apos;épreuve 🎉
          </h1>
          <div className="text-7xl font-bold text-blue-600 mb-2">
            {percentage}%
          </div>
          <div className="text-xl text-gray-700 dark:text-gray-200 mb-1">
            Note globale de l&apos;épreuve
          </div>
          <div className="text-md text-gray-600 dark:text-gray-300 mb-4">
            Soit environ {(moyenne * 20).toFixed(1)}/20
          </div>
          <div className="text-gray-600 dark:text-gray-300 mb-8">
            {qcmData.matiere} - {qcmData.annee}
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push("/")}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
            >
              Retour Accueil
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold"
            >
              Recommencer
            </button>
          </div>
        </div>

        {/* Détail des réponses */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold mb-2">
            Détail des réponses par question
          </h2>

          {qcmData.questions.map((q) => {
            const ans = userAnswers[q.id];
            const score = getQuestionScore(q, ans);
            const isCorrectLike =
              score === 1; // pour garder le badge 1/1 vs 0/1 visuel

            const userAnsArray =
              q.type === "QROC"
                ? []
                : (((ans as string[]) || []).slice().sort());

            const correctAnsArray =
              q.type === "QROC" ? [] : [...q.reponses].sort();

            return (
              <div
                key={q.id}
                className={`bg-white dark:bg-gray-900 p-6 rounded-xl shadow-md border-l-4 ${
                  isCorrectLike ? "border-green-500" : "border-red-500"
                }`}
              >
                {/* Header question + note (affichée sur 1 avec décimales) */}
                <div className="flex justify-between items-center mb-3">
                  <div className="font-bold">
                    Question {q.id} - {q.type}
                  </div>
                  <div
                    className={`text-sm font-semibold px-3 py-1 rounded-full ${
                      score > 0
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                        : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                    }`}
                  >
                    {score.toFixed(2)} / 1
                  </div>
                </div>

                {q.contexte && (
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg mb-3 text-sm text-gray-700 dark:text-gray-200">
                    {q.contexte}
                  </div>
                )}

                <div className="mb-4 text-gray-800 dark:text-gray-100 font-medium">
                  {q.question}
                </div>

                {/* QROC : on affiche juste la réponse saisie + attendues */}
                {q.type === "QROC" ? (
                  <>
                    <div className="mb-3">
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-semibold">Ta réponse : </span>
                        {((ans as string) || "").trim() || "Aucune"}
                      </div>
                      <div className="text-sm text-green-700 dark:text-green-300">
                        <span className="font-semibold">
                          Réponses attendues :{" "}
                        </span>
                        {q.reponses.join(", ")}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Affichage des réponses QCM avec codes couleur */}
                    <div className="space-y-2 mb-3">
                      {q.choix.map((choix) => {
                        const letter = choix.charAt(0);

                        const isInCorrect = q.reponses.includes(letter);
                        const isSelected = userAnsArray.includes(letter);

                        let borderClass =
                          "border-gray-200 dark:border-gray-700";
                        let bgClass =
                          "bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800";
                        let textClass =
                          "text-gray-800 dark:text-gray-100";

                        if (isInCorrect) {
                          borderClass =
                            "border-green-500 dark:border-green-500";
                          bgClass = "bg-green-50 dark:bg-green-900/20";
                          textClass =
                            "text-green-800 dark:text-green-200";
                        } else if (isSelected && !isInCorrect) {
                          borderClass =
                            "border-red-500 dark:border-red-500";
                          bgClass = "bg-red-50 dark:bg-red-900/20";
                          textClass =
                            "text-red-800 dark:text-red-200";
                        } else if (!isSelected && !isInCorrect) {
                          borderClass =
                            "border-gray-300 dark:border-gray-700";
                          bgClass =
                            "bg-gray-50 dark:bg-gray-900/60";
                          textClass =
                            "text-gray-500 dark:text-gray-400";
                        }

                        return (
                          <div
                            key={choix}
                            className={`w-full p-3 rounded-lg border ${borderClass} ${bgClass} ${textClass} text-sm`}
                          >
                            {choix}
                          </div>
                        );
                      })}
                    </div>

                    {/* Rappel synthétique */}
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-semibold">
                        Tes réponses :{" "}
                      </span>
                      {userAnsArray.length > 0
                        ? userAnsArray.join(", ")
                        : "Aucune"}
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-300">
                      <span className="font-semibold">
                        Bonnes réponses :{" "}
                      </span>
                      {correctAnsArray.join(", ")}
                    </div>
                    {q.type === "QRP" && q.maxReponses && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        QRP : {q.maxReponses} réponses attendues.
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const rawAns = userAnswers[currentQuestion.id];
  const selectedAnswers =
    currentQuestion.type === "QROC"
      ? ""
      : ((rawAns as string[] | undefined) || []);
  const qrocValue =
    currentQuestion.type === "QROC"
      ? ((rawAns as string | undefined) || "")
      : "";

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-gray-900 dark:text-gray-100">
      <Link
        href="/"
        className="text-blue-600 dark:text-blue-400 hover:underline mb-6 inline-block"
      >
        ← Retour Accueil
      </Link>

      <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-md mb-6 border border-gray-100 dark:border-gray-800">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
          {qcmData.matiere} - {qcmData.annee}
        </h2>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
          <span>
            Question {currentIndex + 1}/{totalQuestions}
          </span>
          <span>
            {Math.round(((currentIndex + 1) / totalQuestions) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all"
            style={{
              width: `${((currentIndex + 1) / totalQuestions) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-lg mb-6 border border-gray-100 dark:border-gray-800">
        <div className="flex justify-between items-center mb-4">
          <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 px-4 py-2 rounded-full text-sm font-semibold">
            {currentQuestion.type}
            {currentQuestion.type === "QRP" &&
              currentQuestion.maxReponses && (
                <> — {currentQuestion.maxReponses} réponses attendues</>
              )}
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            Question {currentQuestion.id}
          </span>
        </div>

        {currentQuestion.contexte && (
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-6 text-sm text-gray-700 dark:text-gray-200 border-l-4 border-blue-400">
            {currentQuestion.contexte}
          </div>
        )}

        {currentQuestion.image && (
          <div className="mb-6 flex justify-center">
            <img
              src={currentQuestion.image}
              alt={`Illustration Q${currentQuestion.id}`}
              className="max-h-72 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm object-contain"
            />
          </div>
        )}

        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          {currentQuestion.question}
        </h2>

        {/* QROC : champ texte */}
        {currentQuestion.type === "QROC" ? (
          <div className="mb-6">
            <input
              type="text"
              value={qrocValue}
              onChange={(e) => handleQROCChange(e.target.value)}
              className="w-full border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-3 rounded-lg focus:border-blue-500 focus:outline-none"
              placeholder="Tapez votre réponse courte ici"
            />
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {currentQuestion.choix.map((choix) => {
              const letter = choix.charAt(0);
              const isSelected = (selectedAnswers as string[]).includes(
                letter
              );

              return (
                <button
                  key={choix}
                  onClick={() => handleAnswerSelect(letter)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/40 shadow-md"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  <span className="font-medium">{choix}</span>
                </button>
              );
            })}
          </div>
        )}

        {showCorrection && currentQuestion.type !== "QROC" && (
          <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border-2 border-green-200 dark:border-green-600">
            <div className="font-semibold text-green-800 dark:text-green-300 mb-2">
              ✅ Réponse(s) correcte(s):
            </div>
            <div className="text-green-700 dark:text-green-300 font-medium">
              {currentQuestion.reponses.join(", ")}
            </div>
          </div>
        )}
        {showCorrection && currentQuestion.type === "QROC" && (
          <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border-2 border-green-200 dark:border-green-600">
            <div className="font-semibold text-green-800 dark:text-green-300 mb-2">
              ✅ Réponses attendues (QROC):
            </div>
            <div className="text-green-700 dark:text-green-300 font-medium">
              {currentQuestion.reponses.join(", ")}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-6 py-3 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          ← Précédent
        </button>

        <button
          onClick={() => setShowCorrection(!showCorrection)}
          className="bg-yellow-500 text-white px-6 py-3 rounded-lg hover:bg-yellow-600 font-semibold"
        >
          {showCorrection ? "Cacher" : "Voir correction"}
        </button>

        <button
          onClick={handleNext}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
        >
          {currentIndex < totalQuestions - 1 ? "Suivant →" : "Terminer"}
        </button>
      </div>
    </div>
  );
}
