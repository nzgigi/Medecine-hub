"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

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

export default function QCMPage() {
  const params = useParams();
  const router = useRouter();
  const matiere = params.matiere as string;
  const annee = params.annee as string;

  const [qcmData, setQcmData] = useState<QCMData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string[] }>({});
  const [showResults, setShowResults] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);

  useEffect(() => {
    async function loadQCM() {
      try {
        const response = await fetch(`/data/qcm/${matiere}_${annee}.json`);
        const data = await response.json();
        setQcmData(data);
      } catch (error) {
        console.error('Erreur chargement QCM:', error);
      }
    }
    loadQCM();
  }, [matiere, annee]);

  if (!qcmData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="text-2xl">Chargement...</div>
      </div>
    );
  }

  const currentQuestion = qcmData.questions[currentIndex];
  const totalQuestions = qcmData.questions.length;

  const handleAnswerSelect = (choice: string) => {
    const questionId = currentQuestion.id;
    const currentAnswers = userAnswers[questionId] || [];

    if (currentQuestion.type === 'QRU') {
      setUserAnswers({ ...userAnswers, [questionId]: [choice] });
    } else {
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

  const calculateResults = () => {
    const score = qcmData.questions.reduce((acc, q) => {
      const userAns = (userAnswers[q.id] || []).sort();
      const correctAns = q.reponses.sort();
      
      if (JSON.stringify(userAns) === JSON.stringify(correctAns)) {
        return acc + 1;
      }
      return acc;
    }, 0);

    const result = {
      matiere: qcmData.matiere,
      annee: qcmData.annee,
      score,
      total: totalQuestions,
      date: new Date().toISOString(),
    };

    const history = JSON.parse(localStorage.getItem('qcm_history') || '[]');
    history.push(result);
    localStorage.setItem('qcm_history', JSON.stringify(history));

    setShowResults(true);
  };

  if (showResults) {
    const score = qcmData.questions.reduce((acc, q) => {
      const userAns = (userAnswers[q.id] || []).sort();
      const correctAns = q.reponses.sort();
      return JSON.stringify(userAns) === JSON.stringify(correctAns) ? acc + 1 : acc;
    }, 0);

    const percentage = Math.round((score / totalQuestions) * 100);

    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Resultats 🎉</h1>
          <div className="text-7xl font-bold text-blue-600 mb-4">{score}/{totalQuestions}</div>
          <div className="text-3xl text-gray-700 mb-2">{percentage}%</div>
          <div className="text-gray-600 mb-8">{qcmData.matiere} - {qcmData.annee}</div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push('/')}
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
          <h2 className="text-2xl font-bold">Detail des reponses</h2>
          {qcmData.questions.map((q) => {
            const userAns = (userAnswers[q.id] || []).sort();
            const correctAns = q.reponses.sort();
            const isCorrect = JSON.stringify(userAns) === JSON.stringify(correctAns);

            return (
              <div
                key={q.id}
                className={`bg-white p-6 rounded-lg shadow-md border-l-4 ${
                  isCorrect ? 'border-green-500' : 'border-red-500'
                }`}
              >
                <div className="font-bold mb-2">Question {q.id} - {q.type}</div>
                <div className="mb-2 text-gray-800">{q.question}</div>
                <div className="text-sm text-gray-600">
                  Ta reponse: {userAns.join(', ') || 'Aucune'}
                </div>
                <div className="text-sm text-green-600 font-semibold">
                  Reponse correcte: {correctAns.join(', ')}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const selectedAnswers = userAnswers[currentQuestion.id] || [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link href="/" className="text-blue-600 hover:underline mb-6 inline-block">
        ← Retour Accueil
      </Link>

      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-bold text-gray-800">
          {qcmData.matiere} - {qcmData.annee}
        </h2>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Question {currentIndex + 1}/{totalQuestions}</span>
          <span>{Math.round(((currentIndex + 1) / totalQuestions) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all"
            style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white p-8 rounded-xl shadow-lg mb-6">
        <div className="flex justify-between items-center mb-4">
          <span className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold">
            {currentQuestion.type}
          </span>
          <span className="text-gray-500">Question {currentQuestion.id}</span>
        </div>

        {currentQuestion.contexte && (
          <div className="bg-gray-50 p-4 rounded-lg mb-6 text-sm text-gray-700 border-l-4 border-blue-400">
            {currentQuestion.contexte}
          </div>
        )}

        <h2 className="text-xl font-bold text-gray-900 mb-6">
          {currentQuestion.question}
        </h2>

        <div className="space-y-3 mb-6">
          {currentQuestion.choix.map((choix) => {
            const letter = choix.charAt(0);
            const isSelected = selectedAnswers.includes(letter);

            return (
              <button
                key={choix}
                onClick={() => handleAnswerSelect(letter)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }`}
              >
                <span className="font-medium">{choix}</span>
              </button>
            );
          })}
        </div>

        {showCorrection && (
          <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
            <div className="font-semibold text-green-800 mb-2">
              ✅ Reponse(s) correcte(s):
            </div>
            <div className="text-green-700 font-medium">
              {currentQuestion.reponses.join(', ')}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          ← Precedent
        </button>

        <button
          onClick={() => setShowCorrection(!showCorrection)}
          className="bg-yellow-500 text-white px-6 py-3 rounded-lg hover:bg-yellow-600 font-semibold"
        >
          {showCorrection ? 'Cacher' : 'Voir correction'}
        </button>

        <button
          onClick={handleNext}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
        >
          {currentIndex < totalQuestions - 1 ? 'Suivant →' : 'Terminer'}
        </button>
      </div>
    </div>
  );
}
