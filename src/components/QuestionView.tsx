"use client";

import { useState, type SyntheticEvent } from "react";
import { AlertCircle, CheckCircle, ChevronDown, ChevronUp, Lock } from "lucide-react";
import type {
  AssociationAnswer,
  ImagePoint,
  Question,
  UserAnswer,
} from "@/types/exam";
import { getQuestionImages } from "@/types/exam";
import { getQuestionScore, violatesCritique } from "@/lib/exam/scoring";
import { isQrocAnswerCorrect } from "@/lib/exam/qroc";
import { renderRichText } from "@/lib/text/richText";
import ImageZoneCanvas, { getZoneColor } from "@/components/ImageZoneCanvas";
import ReportQuestionButton from "@/components/ReportQuestionButton";

/**
 * Affichage d'une question et de sa correction, partagé entre l'épreuve
 * (ExamRunner) et l'entraînement (TrainingRunner).
 */

const CONTEXT_COLLAPSE_THRESHOLD = 260;

export function getChoiceLetter(choice: string) {
  return choice.charAt(0);
}

export function handleQuestionImageError(event: SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.style.display = "none";
  const placeholder = event.currentTarget.nextElementSibling as HTMLElement | null;
  if (placeholder) placeholder.style.display = "flex";
}

export function hasAnswer(question: Question, answer: UserAnswer | undefined) {
  if (question.type === "QROC" || question.type === "VALEUR_NUMERIQUE") {
    return typeof answer === "string" && answer.trim().length > 0;
  }

  if (question.type === "ASSOCIATION") {
    return (
      typeof answer === "object" &&
      answer !== null &&
      !Array.isArray(answer) &&
      Object.keys(answer).length > 0
    );
  }

  return Array.isArray(answer) && answer.length > 0;
}

export function QuestionContextBlock({ text }: { text: string }) {
  const isLong = text.length > CONTEXT_COLLAPSE_THRESHOLD;
  const [expanded, setExpanded] = useState(!isLong);

  return (
    <div className="mb-5 overflow-hidden rounded-lg border border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-[#1d1c18]">
      <div
        className={`px-4 py-3 text-sm leading-6 text-stone-700 whitespace-pre-wrap dark:text-stone-200 ${
          !expanded ? "line-clamp-4" : ""
        }`}
      >
        {text}
      </div>

      {isLong && (
        <button
          onClick={() => setExpanded((current) => !current)}
          className="flex w-full items-center justify-center gap-1 border-t border-stone-200 py-1.5 text-xs font-bold text-stone-500 transition-colors hover:text-emerald-700 dark:border-stone-800 dark:text-stone-400 dark:hover:text-emerald-300"
        >
          {expanded ? (
            <>
              Réduire le contexte
              <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Voir tout le contexte
              <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}

/** Énoncé : introduction du dossier, contexte, texte de la question et images. */
export function QuestionStatement({
  question,
  folderDescription,
  onImageClick,
}: {
  question: Question;
  folderDescription?: string;
  onImageClick?: (src: string) => void;
}) {
  return (
    <>
      {folderDescription && (
        <div className="mb-5 whitespace-pre-wrap rounded-lg border-l-4 border-stone-300 bg-stone-50 p-3 text-sm text-stone-700 dark:border-stone-700 dark:bg-[#1d1c18] dark:text-stone-200">
          {folderDescription}
        </div>
      )}

      {question.contexte && <QuestionContextBlock key={question.id} text={question.contexte} />}

      <h2 className="mb-5 whitespace-pre-wrap text-sm leading-snug tracking-tight sm:text-base">
        {renderRichText(question.question)}
      </h2>

      {question.type !== "IMAGE_ZONE" && getQuestionImages(question).length > 0 && (
        <div className="mb-6 flex flex-wrap justify-center gap-3">
          {getQuestionImages(question).map((src, index) => (
            <div key={src} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Illustration ${index + 1} Q${question.id}`}
                className="max-h-72 cursor-zoom-in rounded-lg border border-stone-200 object-contain shadow-sm transition-opacity hover:opacity-90 dark:border-stone-700"
                onError={handleQuestionImageError}
                onClick={() => onImageClick?.(src)}
              />
              <div
                className="hidden max-h-72 w-full max-w-md items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50 p-6 text-center text-sm text-stone-500 dark:border-stone-700 dark:bg-[#1d1c18] dark:text-stone-400"
                style={{ display: "none" }}
              >
                Image indisponible
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

const INPUT_CLASSES =
  "w-full rounded-lg border-2 border-stone-200 bg-white p-3 text-stone-950 focus:border-emerald-600 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-stone-700 dark:bg-[#151512] dark:text-stone-100";

function LockedNotice() {
  return (
    <div className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
      <Lock className="h-4 w-4" />
      Réponse verrouillée
    </div>
  );
}

/** Zone de réponse d'une question ; `onChange` reçoit la réponse complète mise à jour. */
export function QuestionAnswerInput({
  question,
  answer,
  locked,
  onChange,
}: {
  question: Question;
  answer: UserAnswer | undefined;
  locked: boolean;
  onChange: (answer: UserAnswer) => void;
}) {
  if (question.type === "QROC" || question.type === "VALEUR_NUMERIQUE") {
    const isNumeric = question.type === "VALEUR_NUMERIQUE";

    return (
      <div className="space-y-3">
        <input
          type="text"
          inputMode={isNumeric ? "decimal" : undefined}
          value={typeof answer === "string" ? answer : ""}
          onChange={(event) => onChange(event.target.value)}
          disabled={locked}
          className={INPUT_CLASSES}
          placeholder={isNumeric ? "Tapez une valeur numérique" : "Tapez votre réponse courte ici"}
        />
        {locked && <LockedNotice />}
      </div>
    );
  }

  if (question.type === "ASSOCIATION") {
    const current: AssociationAnswer =
      typeof answer === "object" && answer !== null && !Array.isArray(answer) ? answer : {};

    return (
      <div className="space-y-2.5">
        {(question.items ?? []).map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-stone-200 p-3.5 dark:border-stone-700"
          >
            <span className="font-medium">{item.label}</span>
            <select
              value={current[item.id] ?? ""}
              onChange={(event) => onChange({ ...current, [item.id]: event.target.value })}
              disabled={locked}
              className="rounded-lg border-2 border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-950 outline-none focus:border-emerald-600 disabled:cursor-not-allowed disabled:opacity-70 dark:border-stone-700 dark:bg-[#151512] dark:text-stone-100"
            >
              <option value="">Choisir...</option>
              {question.choix.map((choice) => (
                <option key={choice} value={choice}>
                  {choice}
                </option>
              ))}
            </select>
          </div>
        ))}
        {locked && <LockedNotice />}
      </div>
    );
  }

  if (question.type === "IMAGE_ZONE") {
    const points = (Array.isArray(answer) ? answer : []).filter(
      (item): item is ImagePoint => typeof item === "object"
    );
    const zoneImage = getQuestionImages(question)[0];

    if (!zoneImage) {
      return (
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Aucune image n&apos;a été configurée pour cette question.
        </p>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Cliquez sur l&apos;image à l&apos;endroit de l&apos;anomalie. Cliquez sur un marqueur
            pour le retirer.
          </p>
          <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-600 dark:bg-[#1d1c18] dark:text-stone-300">
            {points.length} point{points.length > 1 ? "s" : ""} positionné
            {points.length > 1 ? "s" : ""}
          </span>
        </div>

        <ImageZoneCanvas
          image={zoneImage}
          points={points}
          onAddPoint={locked ? undefined : (point) => onChange([...points, point])}
          onRemovePoint={
            locked ? undefined : (index) => onChange(points.filter((_, i) => i !== index))
          }
          className="max-w-2xl"
        />
        {locked && <LockedNotice />}
      </div>
    );
  }

  const selected = (Array.isArray(answer) ? answer : []).filter(
    (item): item is string => typeof item === "string"
  );

  const toggle = (letter: string) => {
    if (locked) return;

    if (question.type === "QRU") {
      onChange([letter]);
      return;
    }

    if (selected.includes(letter)) {
      onChange(selected.filter((item) => item !== letter));
      return;
    }

    if (question.type === "QRP" && selected.length >= (question.maxReponses || 3)) return;

    onChange([...selected, letter]);
  };

  return (
    <div className="space-y-2.5">
      {question.choix.map((choice) => {
        const letter = getChoiceLetter(choice);
        const isSelected = selected.includes(letter);

        return (
          <button
            key={choice}
            onClick={() => toggle(letter)}
            disabled={locked}
            className={`flex w-full items-center justify-between gap-3 rounded-lg border-2 p-3.5 text-left transition-all disabled:cursor-not-allowed ${
              isSelected
                ? "border-emerald-700 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-950/40 dark:ring-2 dark:ring-emerald-400/30"
                : "border-stone-200 bg-white hover:border-emerald-300 hover:bg-stone-50 dark:border-stone-700 dark:bg-[#151512] dark:hover:border-emerald-600 dark:hover:bg-[#1d1c18]"
            } ${locked ? "opacity-70" : ""}`}
          >
            <span className="font-medium">{choice}</span>
            {isSelected && (
              <CheckCircle className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" />
            )}
          </button>
        );
      })}
      {locked && <LockedNotice />}
    </div>
  );
}

export interface QuestionCorrectionOrigin {
  matiere: string;
  annee: number;
  questionId: number;
}

/**
 * Correction d'une question : réponse donnée, bonne réponse, note et
 * commentaire. `scored` faux = la question n'a pas encore été soumise.
 */
export function QuestionCorrection({
  question,
  answer,
  scored,
  questionNumber,
  origin,
}: {
  question: Question;
  answer: UserAnswer | undefined;
  scored: boolean;
  questionNumber: number;
  /** Provenance, pour le signalement d'erreur ; absent = pas de bouton « Signaler » (QCM privés). */
  origin?: QuestionCorrectionOrigin;
}) {
  const score = getQuestionScore(question, answer);

  const userAnswerArray = (Array.isArray(answer) ? answer : []).filter(
    (item): item is string => typeof item === "string"
  );
  const userImagePoints = (Array.isArray(answer) ? answer : []).filter(
    (item): item is ImagePoint => typeof item === "object"
  );
  const userQrocAnswer = typeof answer === "string" ? answer : "";
  const userAssociationAnswers: AssociationAnswer =
    typeof answer === "object" && answer !== null && !Array.isArray(answer)
      ? answer
      : {};
  const critiqueViolated =
    question.type !== "QROC" &&
    question.type !== "IMAGE_ZONE" &&
    question.type !== "ASSOCIATION" &&
    question.type !== "VALEUR_NUMERIQUE" &&
    violatesCritique(question, userAnswerArray);

  return (
    <div
      className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#151512] sm:p-6"
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 text-sm font-bold text-emerald-800 dark:text-emerald-300">
            Question {questionNumber} • {question.type}
          </div>
          <h3 className="whitespace-pre-wrap text-sm text-stone-950 dark:text-stone-100">
            {renderRichText(question.question)}
          </h3>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div
            className={`rounded-full px-3 py-1 text-sm font-bold ${
              score === 1
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                : score > 0
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
            }`}
          >
            {scored ? `${score.toFixed(2)} / 1` : "Non soumis"}
          </div>
          {origin && (
            <ReportQuestionButton
              matiere={origin.matiere}
              annee={origin.annee}
              questionId={origin.questionId}
              questionText={question.question}
            />
          )}
        </div>
      </div>

      {question.contexte && (
        <div className="mb-4 whitespace-pre-wrap rounded-lg border-l-4 border-emerald-300 bg-stone-50 p-4 text-sm text-stone-700 dark:border-emerald-700 dark:bg-[#1d1c18] dark:text-stone-200">
          {question.contexte}
        </div>
      )}

      {question.type !== "IMAGE_ZONE" && getQuestionImages(question).length > 0 && (
        <div className="mb-4 flex flex-wrap justify-center gap-3">
          {getQuestionImages(question).map((src, index) => (
            <div key={src} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Illustration ${index + 1} Q${question.id}`}
                className="max-h-72 rounded-lg border border-stone-200 object-contain shadow-sm dark:border-stone-700"
                onError={handleQuestionImageError}
              />
              <div
                className="hidden max-h-72 w-full max-w-md items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50 p-6 text-center text-sm text-stone-500 dark:border-stone-700 dark:bg-[#1d1c18] dark:text-stone-400"
                style={{ display: "none" }}
              >
                Image indisponible
              </div>
            </div>
          ))}
        </div>
      )}

      {scored && critiqueViolated && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          Note ramenée à 0 : une réponse indispensable n&apos;a pas été
          cochée, ou une réponse inacceptable a été cochée.
        </div>
      )}

      {question.type === "QROC" ? (
        <div className="space-y-3">
          <div
            className={`rounded-lg border p-4 ${
              isQrocAnswerCorrect(userQrocAnswer, question.reponses)
                ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200"
                : "border-red-500 bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200"
            }`}
          >
            <div className="mb-1 text-sm font-semibold">Réponse donnée :</div>
            <div>{userQrocAnswer.trim() || "Aucune réponse"}</div>
          </div>

          <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-[#1d1c18]">
            <div className="mb-1 text-sm font-semibold text-stone-700 dark:text-stone-200">
              Réponses acceptées :
            </div>
            <div className="font-medium text-emerald-700 dark:text-emerald-300">
              {question.reponses.join(", ")}
            </div>
          </div>
        </div>
      ) : question.type === "IMAGE_ZONE" ? (
        <div className="space-y-3">
          {getQuestionImages(question)[0] ? (
            <ImageZoneCanvas
              image={getQuestionImages(question)[0]}
              points={userImagePoints}
              zones={question.zones ?? []}
              className="max-w-2xl"
            />
          ) : (
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Aucune image configurée pour cette question.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-stone-500 dark:text-stone-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
              Clic correct
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
              Clic hors zone
            </span>
          </div>
          {(question.zones ?? []).length > 0 && (
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-stone-500 dark:text-stone-400">
              {(question.zones ?? []).map((zone, index) => (
                <span key={index} className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full border-2"
                    style={{
                      borderColor: getZoneColor(index),
                      backgroundColor: `${getZoneColor(index)}26`,
                    }}
                  />
                  {zone.label || `Zone ${index + 1}`}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : question.type === "ASSOCIATION" ? (
        <div className="space-y-2">
          {(question.items ?? []).map((item) => {
            const selected = userAssociationAnswers[item.id];
            const isCorrect = selected === item.correctAnswer;

            return (
              <div
                key={item.id}
                className={`rounded-lg border-2 p-3 text-sm ${
                  !selected
                    ? "border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-[#1d1c18]"
                    : isCorrect
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                    : "border-red-500 bg-red-50 dark:bg-red-900/20"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{item.label}</span>
                  <span className={isCorrect ? "text-emerald-800 dark:text-emerald-200" : "text-stone-700 dark:text-stone-200"}>
                    {selected || "Aucune réponse"}
                  </span>
                </div>
                {!isCorrect && (
                  <div className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    Bonne réponse : {item.correctAnswer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : question.type === "VALEUR_NUMERIQUE" ? (
        <div className="space-y-3">
          <div
            className={`rounded-lg border p-4 ${
              question.numericRange &&
              Number.isFinite(Number(userQrocAnswer.replace(",", "."))) &&
              Number(userQrocAnswer.replace(",", ".")) >= question.numericRange.min &&
              Number(userQrocAnswer.replace(",", ".")) <= question.numericRange.max
                ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200"
                : "border-red-500 bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200"
            }`}
          >
            <div className="mb-1 text-sm font-semibold">Réponse donnée :</div>
            <div>{userQrocAnswer.trim() || "Aucune réponse"}</div>
          </div>

          <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-[#1d1c18]">
            <div className="mb-1 text-sm font-semibold text-stone-700 dark:text-stone-200">
              Intervalle accepté :
            </div>
            <div className="font-medium text-emerald-700 dark:text-emerald-300">
              {question.numericRange
                ? `[${question.numericRange.min} ; ${question.numericRange.max}]`
                : "Non défini"}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {question.choix.map((choice) => {
            const letter = getChoiceLetter(choice);
            const isCorrect = question.reponses.includes(letter);
            const isSelected = userAnswerArray.includes(letter);
            const isCritique = (question.critiques ?? []).includes(letter);
            const isNeutralized = (question.neutralized ?? []).includes(letter);

            let classes =
              "bg-stone-50 border-stone-200 text-stone-700 dark:bg-[#1d1c18] dark:border-stone-700 dark:text-stone-200";

            if (isSelected && isCorrect) {
              classes =
                "bg-emerald-50 border-emerald-500 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200";
            } else if (isSelected && !isCorrect) {
              classes =
                "bg-red-50 border-red-500 text-red-800 dark:bg-red-900/20 dark:text-red-200";
            } else if (!isSelected && isCorrect) {
              classes =
                "bg-stone-50 border-emerald-500 text-stone-700 dark:bg-[#1d1c18] dark:text-stone-200";
            }

            if (isNeutralized) {
              classes =
                "bg-slate-50 border-slate-300 text-slate-600 dark:bg-slate-900/20 dark:border-slate-600 dark:text-slate-300";
            }

            return (
              <div
                key={choice}
                className={`rounded-lg border-2 p-3 text-sm ${classes}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span>{choice}</span>
                  {isNeutralized ? (
                    <span
                      className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      title="Neutralisée au barème (comptée juste, aucune pénalisation)"
                    >
                      Neutralisée
                    </span>
                  ) : (
                    isCritique && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          isCorrect
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200"
                        }`}
                      >
                        {isCorrect ? "Indispensable" : "Inacceptable"}
                      </span>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(question.correctionExplanation || question.correctionImage) && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
          <div className="mb-1 font-black text-emerald-900 dark:text-emerald-100">
            Commentaire de correction
          </div>
          {question.correctionExplanation && (
            <div className="whitespace-pre-wrap text-sm text-emerald-800 dark:text-emerald-200">
              {question.correctionExplanation}
            </div>
          )}
          {question.correctionImage && (
            <div className="mt-3 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={question.correctionImage}
                alt="Illustration du commentaire de correction"
                className="max-h-72 rounded-lg border border-emerald-200 object-contain shadow-sm dark:border-emerald-800"
                onError={handleQuestionImageError}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
