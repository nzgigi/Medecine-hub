import { describe, expect, it } from "vitest";
import type { ExamData, Question } from "@/types/exam";
import { isQrocAnswerCorrect } from "./qroc";
import { getExamScore, getQuestionScore, violatesCritique } from "./scoring";

const qrmQuestion: Question = {
  id: 1,
  type: "QRM",
  question: "Question",
  choix: ["A) Alpha", "B) Beta", "C) Gamma", "D) Delta"],
  reponses: ["A", "C"],
};

describe("QROC", () => {
  it("ignore les accents, la casse et les espaces répétés", () => {
    expect(
      isQrocAnswerCorrect("  Sténose   aortique ", ["stenose aortique"])
    ).toBe(true);
  });
});

describe("scoring", () => {
  it("score les QRM avec le barème attendu", () => {
    expect(getQuestionScore(qrmQuestion, ["A", "C"])).toBe(1);
    expect(getQuestionScore(qrmQuestion, ["A"])).toBe(0.5);
    expect(getQuestionScore(qrmQuestion, ["A", "B"])).toBe(0.2);
    expect(getQuestionScore(qrmQuestion, ["B", "D"])).toBe(0);
  });

  it("ne donne aucun point a une question QRM laissee sans reponse", () => {
    expect(getQuestionScore(qrmQuestion, [])).toBe(0);
    expect(getQuestionScore(qrmQuestion, undefined)).toBe(0);
  });

  it("ne pondère pas les catégories absentes d'une épreuve", () => {
    const exam: ExamData = {
      matiere: "Diabetologie",
      annee: 2023,
      total_questions: 1,
      folders: [
        {
          id: "sqi-1",
          type: "SQI",
          title: "Questions isolées",
          order: 1,
          questions: [
            {
              id: 1,
              type: "QRU",
              question: "Question",
              choix: ["A) Juste", "B) Faux"],
              reponses: ["A"],
            },
          ],
        },
      ],
    };

    const score = getExamScore(exam, { 1: ["A"] }, { "sqi-1": true });

    expect(score.categories).toHaveLength(1);
    expect(score.categories[0].type).toBe("SQI");
    expect(score.categories[0].weight).toBe(1);
    expect(score.finalScoreOn20).toBe(20);
  });

  it("compte les dossiers non soumis pour 0 dans la moyenne de leur catégorie", () => {
    const makeQuestion = (id: number): Question => ({
      id,
      type: "QRU",
      question: "Question",
      choix: ["A) Juste", "B) Faux"],
      reponses: ["A"],
    });

    const exam: ExamData = {
      matiere: "Maladies Transmissibles",
      annee: 2023,
      total_questions: 2,
      folders: [
        {
          id: "dp-1",
          type: "DP",
          title: "Dossier 1",
          order: 1,
          questions: [makeQuestion(1)],
        },
        {
          id: "dp-2",
          type: "DP",
          title: "Dossier 2",
          order: 2,
          questions: [makeQuestion(2)],
        },
      ],
    };

    // Seul le dossier 1 est soumis (et repondu correctement) ; le dossier 2
    // n'a pas ete soumis du tout.
    const score = getExamScore(exam, { 1: ["A"] }, { "dp-1": true });

    const dpCategory = score.categories.find((category) => category.type === "DP");
    expect(dpCategory?.averageOn20).toBe(10);
    expect(dpCategory?.submittedFoldersCount).toBe(1);
  });
});

describe("réponses critiques (indispensable / inacceptable)", () => {
  const critiqueQuestion: Question = {
    ...qrmQuestion,
    critiques: ["A", "D"],
  };

  it("annule la question si une réponse indispensable n'est pas cochée", () => {
    expect(violatesCritique(critiqueQuestion, ["C"])).toBe(true);
    expect(getQuestionScore(critiqueQuestion, ["C"])).toBe(0);
  });

  it("annule la question si une réponse inacceptable est cochée", () => {
    expect(violatesCritique(critiqueQuestion, ["A", "C", "D"])).toBe(true);
    expect(getQuestionScore(critiqueQuestion, ["A", "C", "D"])).toBe(0);
  });

  it("note normalement quand les contraintes critiques sont respectées", () => {
    expect(violatesCritique(critiqueQuestion, ["A", "C"])).toBe(false);
    expect(getQuestionScore(critiqueQuestion, ["A", "C"])).toBe(1);
  });

  it("ne change rien quand aucun choix n'est marqué critique", () => {
    expect(violatesCritique(qrmQuestion, ["B", "D"])).toBe(false);
  });
});
