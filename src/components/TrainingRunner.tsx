"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle, LogOut, RotateCcw, Timer } from "lucide-react";
import type { UserAnswer } from "@/types/exam";
import { getQuestionScore } from "@/lib/exam/scoring";
import {
  countBlockQuestions,
  type PoolQuestion,
  type TrainingBlock,
} from "@/lib/exam/privateTraining";
import { recordPrivateOutcomes } from "@/lib/exam/privateClient";
import {
  hasAnswer,
  QuestionAnswerInput,
  QuestionBadges,
  QuestionCorrectionBody,
  scorePillClass,
  QuestionStatement,
} from "@/components/QuestionView";

interface QueueItem {
  block: TrainingBlock;
  entry: PoolQuestion;
  /** Rang dans le bloc, à partir de 1. */
  indexInBlock: number;
}

interface Result {
  entry: PoolQuestion;
  answer: UserAnswer | undefined;
  score: number;
  correct: boolean;
}

function formatElapsed(ms: number) {
  const total = Math.floor(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

const FOLDER_LABEL = { SQI: "SQI", DP: "DP", KFP: "KFP" } as const;

const CARD_CLASSES =
  "rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-[#151512]";
const PRIMARY_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-800 px-5 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50";
const SECONDARY_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-stone-300 px-5 py-2.5 font-semibold text-stone-800 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800";

/**
 * Entraînement : une question à la fois, « Valider », correction immédiate,
 * « Suivant ». Chaque réponse validée est enregistrée tout de suite (« Quitter »
 * ne perd donc rien) et ne se modifie plus.
 */
export default function TrainingRunner({
  blocks,
  onRestartWithKeys,
  onBackToSetup,
  quitHref,
}: {
  blocks: TrainingBlock[];
  /** « Refaire les erreurs de cette session ». */
  onRestartWithKeys: (keys: string[]) => void;
  onBackToSetup: () => void;
  quitHref: string;
}) {
  const queue = useMemo<QueueItem[]>(
    () =>
      blocks.flatMap((block) =>
        block.questions.map((entry, index) => ({ block, entry, indexInBlock: index + 1 }))
      ),
    [blocks]
  );
  const total = countBlockQuestions(blocks);

  const [position, setPosition] = useState(0);
  const [answer, setAnswer] = useState<UserAnswer | undefined>(undefined);
  const [results, setResults] = useState<Result[]>([]);
  const [finished, setFinished] = useState(false);

  const startedAt = useRef(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  useEffect(() => {
    if (finished) return;
    const timer = window.setInterval(() => setElapsed(Date.now() - startedAt.current), 1000);
    return () => window.clearInterval(timer);
  }, [finished]);

  const current = queue[position];
  const validated = results.length > position;
  const result = validated ? results[position] : null;

  const validatedCount = results.length;
  const exactCount = results.filter((r) => r.correct).length;
  const points = results.reduce((sum, r) => sum + r.score, 0);
  const percent = validatedCount === 0 ? 0 : Math.round((exactCount / validatedCount) * 100);

  const validate = () => {
    if (!current || validated || !hasAnswer(current.entry.question, answer)) return;

    // Barème de l'épreuve (crédit partiel des QRM, critiques, neutralisées...) ; juste = note pleine.
    const score = getQuestionScore(current.entry.question, answer);
    const correct = score === 1;

    setResults((previous) => [...previous, { entry: current.entry, answer, score, correct }]);

    void recordPrivateOutcomes([
      {
        key: current.entry.key,
        slug: current.entry.slug,
        annee: current.entry.annee,
        matiere: current.entry.matiere,
        folderTitle: current.entry.folderTitle,
        questionText: current.entry.question.question,
        correct,
      },
    ]);
  };

  const next = () => {
    if (position + 1 >= queue.length) {
      setElapsed(Date.now() - startedAt.current);
      setFinished(true);
      return;
    }
    setPosition(position + 1);
    setAnswer(undefined);
  };

  if (queue.length === 0) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <p className="mb-4 font-bold">Aucune question pour ces réglages.</p>
        <button onClick={onBackToSetup} className={SECONDARY_BUTTON}>
          <ArrowLeft className="h-4 w-4" />
          Retour aux réglages
        </button>
      </div>
    );
  }

  if (finished) {
    const wrong = results.filter((r) => !r.correct);

    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className={`${CARD_CLASSES} p-6 sm:p-8`}>
          <h1 className="mb-1 text-2xl font-black">Récapitulatif</h1>
          <p className="mb-6 text-sm text-stone-500 dark:text-stone-400">
            {validatedCount} question{validatedCount > 1 ? "s" : ""} validée
            {validatedCount > 1 ? "s" : ""} sur {total}.
          </p>

          <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Score", `${formatPoints(points)} / ${validatedCount}`],
              ["Bonnes réponses", `${percent} %`],
              ["Temps", formatElapsed(elapsed)],
              ["Erreurs", String(wrong.length)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-stone-50 p-3 dark:bg-[#1d1c18]">
                <dt className="text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                  {label}
                </dt>
                <dd className="mt-1 text-xl font-black">{value}</dd>
              </div>
            ))}
          </dl>

          {wrong.length > 0 && (
            <ul className="mb-6 divide-y divide-stone-100 rounded-lg border border-stone-200 dark:divide-stone-800 dark:border-stone-800">
              {wrong.map((r) => (
                <li key={r.entry.key} className="px-4 py-2.5 text-sm">
                  <span className="font-bold text-stone-500 dark:text-stone-400">
                    {r.entry.matiere} · {r.entry.folderTitle} —{" "}
                  </span>
                  {r.entry.question.question.slice(0, 160)}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-3">
            {wrong.length > 0 && (
              <button onClick={() => onRestartWithKeys(wrong.map((r) => r.entry.key))} className={PRIMARY_BUTTON}>
                <RotateCcw className="h-4 w-4" />
                Refaire les erreurs de cette session
              </button>
            )}
            <button onClick={onBackToSetup} className={SECONDARY_BUTTON}>
              Nouvel entraînement
            </button>
            <Link href={quitHref} className={SECONDARY_BUTTON}>
              Quitter
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { entry, block, indexInBlock } = current;
  const isBlock = block.folder.type !== "SQI";

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div
        className={`${CARD_CLASSES} sticky top-2 z-10 mb-4 flex flex-wrap items-center justify-between gap-x-5 gap-y-2 px-4 py-3 text-sm`}
        aria-label="Compteurs"
      >
        <span className="font-black">
          Question {position + 1} / {total}
        </span>
        <span>
          Score <strong>{formatPoints(points)}</strong> / {validatedCount}
        </span>
        <span>
          Bonnes réponses <strong>{percent} %</strong>
        </span>
        <span className="inline-flex items-center gap-1 text-stone-600 dark:text-stone-300">
          <Timer className="h-4 w-4" />
          {formatElapsed(elapsed)}
        </span>
        <Link
          href={quitHref}
          className="inline-flex items-center gap-1.5 font-semibold text-stone-500 hover:text-red-600 dark:text-stone-400"
          title="Les réponses déjà validées sont conservées"
        >
          <LogOut className="h-4 w-4" />
          Quitter
        </Link>
      </div>

      <div className={CARD_CLASSES}>
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 px-5 py-3 text-xs font-bold text-stone-500 dark:border-stone-800 dark:text-stone-400">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            {FOLDER_LABEL[block.folder.type]}
          </span>
          <span>{entry.matiere}</span>
          {isBlock && (
            <span className="text-stone-400 dark:text-stone-500">
              · Question {indexInBlock} / {block.questions.length} du dossier
            </span>
          )}
          <span className="ml-auto">
            <QuestionBadges question={entry.question} />
          </span>
        </div>

        <div className="p-5 sm:p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
              Question {position + 1} · {entry.question.type}
            </div>
            {validated && result && (
              <div className={scorePillClass(result.score)}>{result.score.toFixed(2)} / 1</div>
            )}
          </div>

          <QuestionStatement question={entry.question} folderDescription={block.folder.description} />

          {validated && result ? (
            <QuestionCorrectionBody question={entry.question} answer={result.answer} scored />
          ) : (
            <QuestionAnswerInput
              question={entry.question}
              answer={answer}
              locked={false}
              onChange={setAnswer}
            />
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        {validated ? (
          <button onClick={next} className={PRIMARY_BUTTON} autoFocus>
            {position + 1 >= queue.length ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Terminer
              </>
            ) : (
              <>
                Suivant
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        ) : (
          <button
            onClick={validate}
            disabled={!hasAnswer(entry.question, answer)}
            className={PRIMARY_BUTTON}
            title={hasAnswer(entry.question, answer) ? "Valider la réponse" : "Réponds d'abord à la question"}
          >
            <CheckCircle className="h-4 w-4" />
            Valider
          </button>
        )}
      </div>
    </div>
  );
}

function formatPoints(points: number) {
  return Number.isInteger(points) ? String(points) : points.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}
