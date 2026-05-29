"use client";

import { useMemo, useState } from "react";

interface Replica {
  speaker: "Interviewer" | "Candidate";
  text: string;
}

interface Mistake {
  expected: string;
  answer: string;
}

const dialogue: Replica[] = [
  { speaker: "Interviewer", text: "Good morning. Please, have a seat." },
  { speaker: "Candidate", text: "Good morning. Thank you." },
  { speaker: "Interviewer", text: "Could you introduce yourself?" },
  {
    speaker: "Candidate",
    text: "Sure. My name is Alex Martin. I'm 18 years old and I'm a student. I'm looking for a part-time job to gain experience.",
  },
  { speaker: "Interviewer", text: "Why are you interested in this position?" },
  {
    speaker: "Candidate",
    text: "Because I enjoy helping people and I want to learn new skills in a professional environment.",
  },
  { speaker: "Interviewer", text: "Have you worked before?" },
  {
    speaker: "Candidate",
    text: "Yes, I worked in a small shop last summer. I served customers, organized products, and cleaned the store.",
  },
  { speaker: "Interviewer", text: "What are your main strengths?" },
  {
    speaker: "Candidate",
    text: "I'm responsible, polite, and always on time. I also enjoy working in a team.",
  },
  { speaker: "Interviewer", text: "And what about your weaknesses?" },
  {
    speaker: "Candidate",
    text: "Sometimes I get nervous when I talk in front of many people, but I'm improving.",
  },
  { speaker: "Interviewer", text: "When could you start?" },
  { speaker: "Candidate", text: "I'm available from next Monday." },
  { speaker: "Interviewer", text: "Great. Do you have any questions for me?" },
  { speaker: "Candidate", text: "Yes. What are the usual working hours?" },
  {
    speaker: "Interviewer",
    text: "From 9 a.m. to 5 p.m., Monday to Friday.",
  },
  {
    speaker: "Candidate",
    text: "That sounds perfect. Thank you for your time.",
  },
  { speaker: "Interviewer", text: "You're welcome. We'll contact you soon." },
  { speaker: "Candidate", text: "Thank you. Have a great day!" },
];

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(a: string, b: string) {
  const normalizedA = normalize(a);
  const normalizedB = normalize(b);
  const len = Math.min(normalizedA.length, normalizedB.length);

  let errors = 0;

  for (let i = 0; i < len; i++) {
    if (normalizedA[i] !== normalizedB[i]) {
      errors++;
    }
  }

  return len === 0 ? 0 : 1 - errors / len;
}

export default function DialogueStudy() {
  const [role, setRole] = useState<"Candidate" | "Interviewer">("Candidate");
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [showHint, setShowHint] = useState(false);

  const myLines = useMemo(
    () =>
      dialogue
        .map((replica, index) => ({ ...replica, index }))
        .filter((replica) => replica.speaker === role),
    [role]
  );

  const current = myLines[step];
  const expected = current?.text;
  const previous = dialogue[(current?.index ?? 0) - 1];

  const reset = () => {
    setStep(0);
    setAnswer("");
    setIsCorrect(null);
    setScore(0);
    setMistakes([]);
    setShowHint(false);
  };

  const next = () => {
    setStep((currentStep) => currentStep + 1);
    setAnswer("");
    setIsCorrect(null);
    setShowHint(false);
  };

  const check = () => {
    if (!expected) return;

    const ok = similarity(answer, expected) > 0.85;
    setIsCorrect(ok);

    if (ok) {
      setScore((currentScore) => currentScore + 1);
      setTimeout(next, 600);
    } else {
      setMistakes((currentMistakes) => [
        ...currentMistakes,
        { expected, answer },
      ]);
    }
  };

  const acceptAnswer = () => {
    setScore((currentScore) => currentScore + 1);
    setIsCorrect(true);
    setTimeout(next, 600);
  };

  const skip = () => {
    setIsCorrect(null);
    setAnswer("");
    next();
  };

  const renderRoleSelector = () => (
    <div className="mb-6 bg-white p-6 rounded-xl shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-center">
        🎭 Choose your role
      </h2>

      <div className="flex gap-4">
        <button
          onClick={() => {
            setRole("Candidate");
            reset();
          }}
          className={`flex-1 p-4 rounded-xl font-semibold transition ${
            role === "Candidate"
              ? "bg-blue-500 text-white shadow-lg"
              : "bg-gray-200 hover:bg-gray-300"
          }`}
        >
          👨‍🎓 Candidate
        </button>

        <button
          onClick={() => {
            setRole("Interviewer");
            reset();
          }}
          className={`flex-1 p-4 rounded-xl font-semibold transition ${
            role === "Interviewer"
              ? "bg-green-500 text-white shadow-lg"
              : "bg-gray-200 hover:bg-gray-300"
          }`}
        >
          💼 Interviewer
        </button>
      </div>
    </div>
  );

  if (!current) {
    return (
      <div className="min-h-screen p-10 bg-green-50">
        <h1 className="text-4xl font-bold text-center mb-6">
          🎉 Congratulations!
        </h1>

        <p className="text-center text-xl mb-6">
          Score:{" "}
          <strong>
            {score} / {myLines.length}
          </strong>{" "}
          ({Math.round((score / myLines.length) * 100)}%)
        </p>

        <div className="text-center mb-8">
          <button
            onClick={reset}
            className="px-8 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600"
          >
            🔄 Restart
          </button>
        </div>

        {mistakes.length > 0 && (
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-2xl font-bold text-center mb-4">
              📝 Your mistakes
            </h2>

            {mistakes.map((mistake, index) => (
              <div key={index} className="p-4 bg-white rounded-xl shadow">
                <p className="text-sm text-gray-600">Your answer:</p>
                <p className="font-semibold text-red-600">
                  {mistake.answer || "— empty —"}
                </p>

                <p className="mt-2 text-sm text-gray-600">Correct answer:</p>
                <p className="font-bold text-green-700">{mistake.expected}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-orange-50 to-pink-50">
      {renderRoleSelector()}

      <div className="mb-6 bg-white p-4 rounded-xl shadow">
        <div className="flex justify-between mb-2">
          <span className="font-semibold">
            Question {step + 1} / {myLines.length}
          </span>

          <span className="text-green-600 font-bold">✅ {score}</span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all"
            style={{ width: `${((step + 1) / myLines.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="mb-6 bg-white p-5 rounded-xl shadow-lg border-l-4 border-blue-500">
        <div className="text-sm text-gray-600 mb-1">
          {previous?.speaker} said:
        </div>

        <div className="text-lg font-semibold">{previous?.text}</div>
      </div>

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            check();
          }
        }}
        rows={3}
        className="w-full p-4 text-lg border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none shadow"
        placeholder="Write your answer here or practice speaking... (Enter = check)"
        autoFocus
      />

      <div className="mt-4 flex gap-3">
        <button
          onClick={check}
          className="flex-1 bg-green-500 text-white p-3 rounded-xl font-semibold hover:bg-green-600"
        >
          ✅ Check (Enter)
        </button>

        <button
          onClick={acceptAnswer}
          className="flex-1 bg-emerald-500 text-white p-3 rounded-xl font-semibold hover:bg-emerald-600"
        >
          ⭐ I said that
        </button>

        <button
          onClick={skip}
          className="flex-1 bg-gray-400 text-white p-3 rounded-xl font-semibold hover:bg-gray-500"
        >
          ⏭️ Skip
        </button>
      </div>

      <button
        onClick={() => setShowHint((currentValue) => !currentValue)}
        className="w-full mt-3 p-3 bg-yellow-400 text-gray-900 rounded-xl font-semibold hover:bg-yellow-500"
      >
        💡 {showHint ? "Hide" : "Show"} hint
      </button>

      {showHint && expected && (
        <div className="mt-4 bg-yellow-50 p-4 rounded-xl border-2 border-yellow-400">
          <div className="font-semibold text-gray-700 mb-2">
            💡 Start of sentence:
          </div>

          <div className="text-lg font-mono">
            {expected.split(" ").slice(0, 3).join(" ")}...
          </div>
        </div>
      )}

      {isCorrect === false && (
        <div className="mt-4 bg-red-50 p-5 rounded-xl border-2 border-red-300 shadow">
          <div className="text-red-700 font-bold mb-2">❌ Not quite...</div>
          <div className="text-sm text-gray-600 mb-1">Expected answer:</div>
          <div className="font-bold text-lg">{expected}</div>
        </div>
      )}

      {isCorrect === true && (
        <div className="mt-4 bg-green-50 p-5 rounded-xl border-2 border-green-300 shadow">
          <div className="text-green-700 font-bold text-center text-xl">
            ✅ Correct! 🎉
          </div>
        </div>
      )}
    </div>
  );
}