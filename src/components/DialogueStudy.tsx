"use client";
import { useState, useMemo } from "react";

/* ===================== TYPES ===================== */
interface Replica {
  speaker: "Verkoper" | "Klant";
  text: string;
}

interface Mistake {
  expected: string;
  answer: string;
}

/* ===================== DIALOGUE ===================== */
const dialogue: Replica[] = [
  { speaker: "Verkoper", text: "Goedemiddag, welkom in de winkel. Kan ik u helpen?" },
  { speaker: "Klant", text: "Goedemiddag. Ik zoek een laptop." },
  { speaker: "Verkoper", text: "Waarvoor hebt u de laptop nodig? Voor school of werk?" },
  { speaker: "Klant", text: "Vooral voor school en een beetje voor films en games." },
  { speaker: "Verkoper", text: "Oké, duidelijk. Wat is uw maximum budget voor een laptop?" },
  { speaker: "Klant", text: "Mijn maximum budget is ongeveer 900 euro." },
  { speaker: "Verkoper", text: "Oké. Dan is deze Macbook laptop goed. Hij is snel en de batterij gaat lang mee." },
  { speaker: "Klant", text: "Is hij zwaar? Ik wil een lichte laptop." },
  { speaker: "Verkoper", text: "Nee, hij is licht. U kunt hem makkelijk in uw rugzak meenemen." },
  { speaker: "Klant", text: "Is er garantie op de laptop?" },
  { speaker: "Verkoper", text: "Ja, twee jaar garantie. Bij problemen helpt onze dienst na verkoop u." },
  { speaker: "Klant", text: "Goed. Wat kost hij?" },
  { speaker: "Verkoper", text: "De laptop is nu in promotie. Hij kost 899 euro." },
  { speaker: "Klant", text: "Dat is goed, ik neem hem." },
  { speaker: "Verkoper", text: "Mag ik u nog iets voorstellen? Omdat u de laptop vaak gebruikt, is een extra oplader handig." },
  { speaker: "Klant", text: "Waarom is een extra oplader handig?" },
  { speaker: "Verkoper", text: "U kunt één oplader thuis laten en één in uw tas steken. Zo vergeet u nooit uw oplader." },
  { speaker: "Klant", text: "Is deze oplader goed voor deze laptop?" },
  { speaker: "Verkoper", text: "Ja, hij is speciaal voor dit model. Hij kost 35 euro." },
  { speaker: "Klant", text: "Oké, ik neem de oplader ook." },
  { speaker: "Verkoper", text: "Perfect. Dus een laptop en een oplader. Dat is samen 934 euro." },
  { speaker: "Klant", text: "Kan ik cash betalen?" },
  { speaker: "Verkoper", text: "Ja, natuurlijk. 934 euro alstublieft." },
  { speaker: "Klant", text: "Hier is 950 euro." },
  { speaker: "Verkoper", text: "Dank u wel. Dat is 16 euro terug. Alstublieft." },
  { speaker: "Klant", text: "Dank u." },
  { speaker: "Verkoper", text: "Hier is uw ticket en uw garantie. Fijne dag nog!" },
  { speaker: "Klant", text: "Dank u, tot ziens!" }
];

/* ===================== UTILS ===================== */
function normalize(text: string) {
  return text.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
}

function similarity(a: string, b: string) {
  a = normalize(a);
  b = normalize(b);
  const len = Math.min(a.length, b.length);
  let errors = 0;
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) errors++;
  }
  return len === 0 ? 0 : 1 - errors / len;
}

/* ===================== COMPONENT ===================== */
export default function DialogueStudy() {
  const [role, setRole] = useState<"Klant" | "Verkoper">("Klant");
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [showHint, setShowHint] = useState(false);

  const myLines = useMemo(
    () =>
      dialogue
        .map((r, index) => ({ ...r, index }))
        .filter((r) => r.speaker === role),
    [role]
  );

  const current = myLines[step];
  const expected = current?.text;
  const previous = dialogue[current?.index - 1];

  const reset = () => {
    setStep(0);
    setAnswer("");
    setIsCorrect(null);
    setScore(0);
    setMistakes([]);
    setShowHint(false);
  };

  const next = () => {
    setStep((s) => s + 1);
    setAnswer("");
    setIsCorrect(null);
    setShowHint(false);
  };

  const check = () => {
    if (!expected) return;

    const ok = similarity(answer, expected) > 0.85;
    setIsCorrect(ok);

    if (ok) {
      setScore((s) => s + 1);
      setTimeout(next, 600);
    } else {
      setMistakes((m) => [...m, { expected, answer }]);
    }
  };

  const acceptAnswer = () => {
    setScore((s) => s + 1);
    setIsCorrect(true);
    setTimeout(next, 600);
  };

  const skip = () => {
    setIsCorrect(null);
    setAnswer("");
    next();
  };

  /* ===================== ROLE SELECTOR ===================== */
  const RoleSelector = () => (
    <div className="mb-6 bg-white p-6 rounded-xl shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-center">🎭 Choisis ton rôle</h2>
      <div className="flex gap-4">
        <button
          onClick={() => {
            setRole("Klant");
            reset();
          }}
          className={`flex-1 p-4 rounded-xl font-semibold transition ${
            role === "Klant"
              ? "bg-blue-500 text-white shadow-lg"
              : "bg-gray-200 hover:bg-gray-300"
          }`}
        >
          🛒 Klant (Client)
        </button>
        <button
          onClick={() => {
            setRole("Verkoper");
            reset();
          }}
          className={`flex-1 p-4 rounded-xl font-semibold transition ${
            role === "Verkoper"
              ? "bg-green-500 text-white shadow-lg"
              : "bg-gray-200 hover:bg-gray-300"
          }`}
        >
          💼 Verkoper (Vendeur)
        </button>
      </div>
    </div>
  );

  /* ===================== END SCREEN ===================== */
  if (!current) {
    return (
      <div className="min-h-screen p-10 bg-green-50">
        <h1 className="text-4xl font-bold text-center mb-6">🎉 Félicitations !</h1>
        <p className="text-center text-xl mb-6">
          Score : <strong>{score} / {myLines.length}</strong> ({Math.round((score / myLines.length) * 100)}%)
        </p>

        <div className="text-center mb-8">
          <button
            onClick={reset}
            className="px-8 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600"
          >
            🔄 Recommencer
          </button>
        </div>

        {mistakes.length > 0 && (
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-2xl font-bold text-center mb-4">📝 Tes erreurs</h2>
            {mistakes.map((m, i) => (
              <div key={i} className="p-4 bg-white rounded-xl shadow">
                <p className="text-sm text-gray-600">Ta réponse :</p>
                <p className="font-semibold text-red-600">{m.answer || "— vide —"}</p>
                <p className="mt-2 text-sm text-gray-600">Phrase correcte :</p>
                <p className="font-bold text-green-700">{m.expected}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ===================== MAIN SCREEN ===================== */
  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-orange-50 to-pink-50">
      <RoleSelector />

      {/* Progress bar */}
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

      {/* Context */}
      <div className="mb-6 bg-white p-5 rounded-xl shadow-lg border-l-4 border-blue-500">
        <div className="text-sm text-gray-600 mb-1">
          {previous?.speaker} dit :
        </div>
        <div className="text-lg font-semibold">{previous?.text}</div>
      </div>

      {/* Answer input */}
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
        placeholder="Écris ta réponse ici ou pratique à l'oral... (Enter = valider)"
        autoFocus
      />

      {/* Buttons */}
      <div className="mt-4 flex gap-3">
        <button onClick={check} className="flex-1 bg-green-500 text-white p-3 rounded-xl font-semibold hover:bg-green-600">
          ✅ Vérifier (Enter)
        </button>
        <button onClick={acceptAnswer} className="flex-1 bg-emerald-500 text-white p-3 rounded-xl font-semibold hover:bg-emerald-600">
          ⭐ J'ai dit ça
        </button>
        <button onClick={skip} className="flex-1 bg-gray-400 text-white p-3 rounded-xl font-semibold hover:bg-gray-500">
          ⏭️ Passer
        </button>
      </div>

      {/* Hint button */}
      <button
        onClick={() => setShowHint(!showHint)}
        className="w-full mt-3 p-3 bg-yellow-400 text-gray-900 rounded-xl font-semibold hover:bg-yellow-500"
      >
        💡 {showHint ? "Cacher" : "Voir"} l'indice
      </button>

      {/* Hint */}
      {showHint && expected && (
        <div className="mt-4 bg-yellow-50 p-4 rounded-xl border-2 border-yellow-400">
          <div className="font-semibold text-gray-700 mb-2">💡 Début de la phrase :</div>
          <div className="text-lg font-mono">{expected.split(" ").slice(0, 3).join(" ")}...</div>
        </div>
      )}

      {/* Feedback */}
      {isCorrect === false && (
        <div className="mt-4 bg-red-50 p-5 rounded-xl border-2 border-red-300 shadow">
          <div className="text-red-700 font-bold mb-2">❌ Pas tout à fait...</div>
          <div className="text-sm text-gray-600 mb-1">Phrase attendue :</div>
          <div className="font-bold text-lg">{expected}</div>
        </div>
      )}

      {isCorrect === true && (
        <div className="mt-4 bg-green-50 p-5 rounded-xl border-2 border-green-300 shadow">
          <div className="text-green-700 font-bold text-center text-xl">✅ Correct ! 🎉</div>
        </div>
      )}
    </div>
  );
}
