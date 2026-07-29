"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  Check,
  ChevronDown,
  Flame,
  PartyPopper,
  X,
} from "lucide-react";
import type { SwipeCard as SwipeCardData } from "@/app/api/swipe/cards/route";
import SwipeCard from "@/components/SwipeCard";
import ThemeToggle from "@/components/ThemeToggle";

interface MatiereOption {
  slug: string;
  matiere: string;
  order: number;
}

interface IndexEntry {
  matiere: string;
  slug: string;
  subjectOrder?: number;
}

interface SwipeStats {
  answered: number;
  correct: number;
  streak: number;
  bestStreak: number;
}

type ExitDirection = "vrai" | "faux" | "skip" | null;

const H_THRESHOLD = 100;
const V_THRESHOLD = 100;
const BEST_STREAK_KEY = "swipe_best_streak";

export default function SwipePage() {
  const [selectedMatiere, setSelectedMatiere] = useState("all");
  const [matiereOptions, setMatiereOptions] = useState<MatiereOption[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  const [cards, setCards] = useState<SwipeCardData[]>([]);
  const [index, setIndex] = useState(0);
  const [loadingCards, setLoadingCards] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [exitDirection, setExitDirection] = useState<ExitDirection>(null);

  const [feedback, setFeedback] = useState<{
    correct: boolean;
    isTrue: boolean;
    proposition: string;
    correctionExplanation?: string;
  } | null>(null);
  const [feedbackVisible, setFeedbackVisible] = useState(false);

  const [stats, setStats] = useState<SwipeStats>({
    answered: 0,
    correct: 0,
    streak: 0,
    bestStreak: 0,
  });

  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? Number(localStorage.getItem(BEST_STREAK_KEY))
        : 0;

    if (saved) {
      setStats((prev) => ({ ...prev, bestStreak: saved }));
    }
  }, []);

  useEffect(() => {
    async function loadMatieres() {
      try {
        const response = await fetch("/data/qcm/index.json?t=" + Date.now());
        const data = (await response.json()) as IndexEntry[];

        const seen = new Set<string>();
        const options: MatiereOption[] = [];

        data.forEach((entry) => {
          if (seen.has(entry.slug)) return;
          seen.add(entry.slug);
          options.push({
            slug: entry.slug,
            matiere: entry.matiere,
            order: entry.subjectOrder ?? 999,
          });
        });

        options.sort((a, b) => a.order - b.order);
        setMatiereOptions(options);
      } catch {
        // Filtre indisponible, "Toutes les matières" reste utilisable.
      }
    }

    loadMatieres();
  }, []);

  const loadDeck = useCallback(async (matiereSlug: string) => {
    setLoadingCards(true);
    setLoadError(false);
    setExitDirection(null);
    setFeedback(null);
    setDrag({ x: 0, y: 0 });

    try {
      const response = await fetch(
        `/api/swipe/cards?matiere=${encodeURIComponent(matiereSlug)}&limit=60&t=${Date.now()}`
      );

      if (!response.ok) throw new Error("Erreur de chargement");

      const data = (await response.json()) as { cards: SwipeCardData[] };

      setCards(data.cards);
      setIndex(0);
      setStats((prev) => ({
        answered: 0,
        correct: 0,
        streak: 0,
        bestStreak: prev.bestStreak,
      }));
    } catch {
      setLoadError(true);
    } finally {
      setLoadingCards(false);
    }
  }, []);

  useEffect(() => {
    loadDeck(selectedMatiere);
  }, [selectedMatiere, loadDeck]);

  useEffect(() => {
    if (feedback) {
      setFeedbackVisible(false);
      const raf = requestAnimationFrame(() => setFeedbackVisible(true));
      return () => cancelAnimationFrame(raf);
    }

    setFeedbackVisible(false);
  }, [feedback]);

  const triggerExit = useCallback(
    (action: "vrai" | "faux" | "skip") => {
      const card = cards[index];
      if (!card || exitDirection) return;

      setExitDirection(action);

      if (action !== "skip") {
        const chosenTrue = action === "vrai";
        const correct = chosenTrue === card.isTrue;

        setStats((prev) => {
          const streak = correct ? prev.streak + 1 : 0;
          const bestStreak = Math.max(prev.bestStreak, streak);

          if (typeof window !== "undefined") {
            localStorage.setItem(BEST_STREAK_KEY, String(bestStreak));
          }

          return {
            answered: prev.answered + 1,
            correct: prev.correct + (correct ? 1 : 0),
            streak,
            bestStreak,
          };
        });

        if (feedbackTimer.current) clearTimeout(feedbackTimer.current);

        setFeedback({
          correct,
          isTrue: card.isTrue,
          proposition: card.proposition,
          correctionExplanation: card.correctionExplanation,
        });

        feedbackTimer.current = setTimeout(() => setFeedback(null), 2800);
      }

      setTimeout(() => {
        setIndex((current) => current + 1);
        setExitDirection(null);
        setDrag({ x: 0, y: 0 });
      }, 250);
    },
    [cards, index, exitDirection]
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (exitDirection || index >= cards.length) return;

      if (event.key === "ArrowLeft") triggerExit("vrai");
      else if (event.key === "ArrowRight") triggerExit("faux");
      else if (event.key === "ArrowDown") triggerExit("skip");
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [exitDirection, index, cards.length, triggerExit]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (exitDirection) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { x: event.clientX, y: event.clientY };
    setDragging(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging || !dragStart.current) return;
    setDrag({
      x: event.clientX - dragStart.current.x,
      y: event.clientY - dragStart.current.y,
    });
  };

  const handlePointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    dragStart.current = null;

    const { x, y } = drag;

    if (Math.abs(y) > Math.abs(x) && y > V_THRESHOLD) {
      triggerExit("skip");
    } else if (x < -H_THRESHOLD) {
      triggerExit("vrai");
    } else if (x > H_THRESHOLD) {
      triggerExit("faux");
    } else {
      setDrag({ x: 0, y: 0 });
    }
  };

  const currentMatiereLabel =
    selectedMatiere === "all"
      ? "Toutes les matières"
      : matiereOptions.find((option) => option.slug === selectedMatiere)
          ?.matiere ?? "Matière";

  const exitTransform =
    exitDirection === "vrai"
      ? { x: -800, y: drag.y - 60, rot: -28 }
      : exitDirection === "faux"
      ? { x: 800, y: drag.y - 60, rot: 28 }
      : exitDirection === "skip"
      ? { x: drag.x, y: 900, rot: 0 }
      : null;

  const activeX = exitTransform ? exitTransform.x : drag.x;
  const activeY = exitTransform ? exitTransform.y : drag.y;
  const rotation = exitTransform ? exitTransform.rot : drag.x / 18;

  const frontStyle = {
    transform: `translate(${activeX}px, ${activeY}px) rotate(${rotation}deg)`,
    transition: dragging ? "none" : "transform 300ms ease",
    zIndex: 3,
  };

  const vraiOpacity =
    exitDirection === "vrai"
      ? 1
      : exitDirection
      ? 0
      : drag.x < 0
      ? Math.min(1, -drag.x / 100)
      : 0;

  const fauxOpacity =
    exitDirection === "faux"
      ? 1
      : exitDirection
      ? 0
      : drag.x > 0
      ? Math.min(1, drag.x / 100)
      : 0;

  const skipOpacity =
    exitDirection === "skip"
      ? 1
      : exitDirection
      ? 0
      : drag.y > Math.abs(drag.x) && drag.y > 0
      ? Math.min(1, drag.y / 100)
      : 0;

  const deckFinished = !loadingCards && !loadError && index >= cards.length;
  const hasActiveDeck = !loadingCards && !loadError && cards.length > 0 && !deckFinished;
  const percent =
    stats.answered > 0 ? Math.round((stats.correct / stats.answered) * 100) : 0;

  return (
    <div className="flex h-[100dvh] flex-col bg-stone-100 text-stone-950 dark:bg-[#101009] dark:text-stone-100">
      <header className="relative z-20 flex items-center justify-between gap-2 border-b border-stone-200 bg-white/95 px-3 py-3 backdrop-blur dark:border-stone-800 dark:bg-[#151512]/95">
        <Link
          href="/"
          aria-label="Retour à l'accueil"
          className="flex shrink-0 items-center gap-1.5 rounded-lg p-2 text-stone-600 transition-colors hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-[#1d1c18]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <div className="relative min-w-0 flex-1">
          <button
            onClick={() => setFilterOpen((current) => !current)}
            className="mx-auto flex max-w-full items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-bold text-stone-700 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:bg-[#1d1c18] dark:text-stone-200"
          >
            <span className="truncate">{currentMatiereLabel}</span>
            <ChevronDown className="h-4 w-4 shrink-0" />
          </button>

          {filterOpen && (
            <div className="absolute left-1/2 top-full z-30 mt-2 max-h-80 w-64 -translate-x-1/2 overflow-y-auto rounded-xl border border-stone-200 bg-white p-1.5 shadow-2xl dark:border-stone-800 dark:bg-[#1a1917]">
              <button
                onClick={() => {
                  setSelectedMatiere("all");
                  setFilterOpen(false);
                }}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors ${
                  selectedMatiere === "all"
                    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-[#1d1c18]"
                }`}
              >
                Toutes les matières
              </button>

              {matiereOptions.map((option) => (
                <button
                  key={option.slug}
                  onClick={() => {
                    setSelectedMatiere(option.slug);
                    setFilterOpen(false);
                  }}
                  className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors ${
                    selectedMatiere === option.slug
                      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-[#1d1c18]"
                  }`}
                >
                  {option.matiere}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1.5 text-xs font-black text-orange-700 dark:bg-orange-950/30 dark:text-orange-300">
            <Flame className="h-3.5 w-3.5" />
            {stats.streak}
          </span>
          <ThemeToggle variant="icon" />
        </div>
      </header>

      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-4">
        {loadingCards && (
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-stone-300 border-b-emerald-800 dark:border-stone-800 dark:border-b-emerald-300" />
            <div className="text-sm font-semibold text-stone-500 dark:text-stone-400">
              Préparation du deck...
            </div>
          </div>
        )}

        {!loadingCards && loadError && (
          <div className="max-w-sm rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm dark:border-stone-800 dark:bg-[#151512]">
            <p className="mb-4 text-stone-600 dark:text-stone-300">
              Impossible de charger les questions.
            </p>
            <button
              onClick={() => loadDeck(selectedMatiere)}
              className="rounded-lg bg-emerald-800 px-4 py-2 font-bold text-white hover:bg-emerald-700"
            >
              Réessayer
            </button>
          </div>
        )}

        {!loadingCards && !loadError && cards.length === 0 && (
          <div className="max-w-sm rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm dark:border-stone-800 dark:bg-[#151512]">
            <p className="text-stone-600 dark:text-stone-300">
              Aucune proposition disponible pour cette matière.
            </p>
          </div>
        )}

        {deckFinished && (
          <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm dark:border-stone-800 dark:bg-[#151512]">
            <PartyPopper className="h-10 w-10 text-emerald-700 dark:text-emerald-300" />
            <h2 className="text-2xl font-black">Deck terminé !</h2>
            <p className="text-stone-600 dark:text-stone-300">
              {stats.correct} bonnes réponses sur {stats.answered}
              {stats.answered > 0 ? ` (${percent}%)` : ""}
            </p>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Meilleur streak : {stats.bestStreak}
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => loadDeck(selectedMatiere)}
                className="rounded-lg bg-emerald-800 px-5 py-2.5 font-bold text-white transition-colors hover:bg-emerald-700"
              >
                Rejouer
              </button>
              <Link
                href="/"
                className="rounded-lg border border-stone-300 px-5 py-2.5 font-bold text-stone-700 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-[#1d1c18]"
              >
                Retour accueil
              </Link>
            </div>
          </div>
        )}

        {hasActiveDeck && (
          <div
            className="relative h-[68vh] max-h-[600px] w-full max-w-sm"
            style={{ touchAction: "none" }}
          >
            {cards[index + 2] && (
              <SwipeCard
                card={cards[index + 2]}
                interactive={false}
                vraiOpacity={0}
                fauxOpacity={0}
                skipOpacity={0}
                style={{
                  transform: "translateY(20px) scale(0.92)",
                  opacity: 0.6,
                  zIndex: 1,
                }}
              />
            )}

            {cards[index + 1] && (
              <SwipeCard
                card={cards[index + 1]}
                interactive={false}
                vraiOpacity={0}
                fauxOpacity={0}
                skipOpacity={0}
                style={{
                  transform: "translateY(10px) scale(0.96)",
                  opacity: 0.85,
                  zIndex: 2,
                }}
              />
            )}

            <SwipeCard
              key={cards[index].id}
              card={cards[index]}
              interactive
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              vraiOpacity={vraiOpacity}
              fauxOpacity={fauxOpacity}
              skipOpacity={skipOpacity}
              style={frontStyle}
            />
          </div>
        )}
      </main>

      {hasActiveDeck && (
        <div className="flex items-center justify-center gap-6 pb-5">
          <button
            onClick={() => triggerExit("faux")}
            aria-label="Faux"
            className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-red-500 bg-white text-red-500 shadow-sm transition-transform active:scale-90 dark:bg-[#151512]"
          >
            <X className="h-6 w-6" />
          </button>

          <button
            onClick={() => triggerExit("skip")}
            aria-label="Passer"
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-stone-400 bg-white text-stone-400 shadow-sm transition-transform active:scale-90 dark:bg-[#151512]"
          >
            <ArrowDown className="h-5 w-5" />
          </button>

          <button
            onClick={() => triggerExit("vrai")}
            aria-label="Vrai"
            className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-emerald-600 bg-white text-emerald-600 shadow-sm transition-transform active:scale-90 dark:bg-[#151512]"
          >
            <Check className="h-6 w-6" />
          </button>
        </div>
      )}

      {feedback && (
        <div
          className={`fixed inset-x-0 bottom-0 z-40 border-t px-5 py-4 shadow-2xl transition-transform duration-300 ${
            feedbackVisible ? "translate-y-0" : "translate-y-full"
          } ${
            feedback.correct
              ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/90"
              : "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/90"
          }`}
        >
          <div className="mx-auto flex max-w-sm items-start gap-3">
            {feedback.correct ? (
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" />
            ) : (
              <X className="mt-0.5 h-5 w-5 shrink-0 text-red-700 dark:text-red-300" />
            )}
            <div className="min-w-0">
              <p
                className={`text-sm font-black ${
                  feedback.correct
                    ? "text-emerald-800 dark:text-emerald-200"
                    : "text-red-800 dark:text-red-200"
                }`}
              >
                {feedback.correct ? "Bonne réponse" : "Mauvaise réponse"} — cette
                proposition est {feedback.isTrue ? "vraie" : "fausse"}
              </p>
              {feedback.correctionExplanation && (
                <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-stone-600 dark:text-stone-300">
                  {feedback.correctionExplanation}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
