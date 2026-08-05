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

describe("propositions neutralisées", () => {
  it("compte juste quelle que soit la reponse quand toutes les bonnes reponses sont neutralisees", () => {
    const question: Question = {
      ...qrmQuestion,
      reponses: ["A", "C"],
      neutralized: ["A", "C"],
    };

    // Meme en cochant une proposition neutralisee, ou rien du tout parmi
    // les non-neutralisees, la note reste parfaite.
    expect(getQuestionScore(question, ["A"])).toBe(1);
    expect(getQuestionScore(question, ["C"])).toBe(1);
    expect(getQuestionScore(question, ["A", "C"])).toBe(1);
  });

  it("penalise toujours les mauvaises reponses non neutralisees", () => {
    const question: Question = {
      ...qrmQuestion,
      reponses: ["A", "C"],
      neutralized: ["A", "C"],
    };

    // B est une mauvaise reponse non neutralisee : elle penalise toujours.
    expect(getQuestionScore(question, ["B"])).toBe(0.5);
  });

  it("neutralise seulement la lettre marquee, pas les autres bonnes reponses", () => {
    const question: Question = {
      ...qrmQuestion,
      reponses: ["A", "C"],
      neutralized: ["A"],
    };

    // A est neutralisee (peu importe), mais C reste une vraie bonne reponse
    // a trouver.
    expect(getQuestionScore(question, ["C"])).toBe(1);
    expect(getQuestionScore(question, ["B"])).toBe(0.2); // C manquee + B en trop
  });
});

describe("IMAGE_ZONE", () => {
  const imageZoneQuestion: Question = {
    id: 1,
    type: "IMAGE_ZONE",
    question: "Entourez l'anomalie",
    choix: [],
    reponses: [],
    image: "/images/qcm/test.png",
    zones: [
      { x: 0.3, y: 0.3, radius: 0.05 },
      { x: 0.7, y: 0.7, radius: 0.05 },
    ],
  };

  it("donne 1 point quand toutes les zones sont trouvées sans clic superflu", () => {
    expect(
      getQuestionScore(imageZoneQuestion, [
        { x: 0.3, y: 0.3 },
        { x: 0.7, y: 0.7 },
      ])
    ).toBe(1);
  });

  it("tolère un clic legerement decale dans le rayon de la zone", () => {
    expect(
      getQuestionScore(imageZoneQuestion, [
        { x: 0.32, y: 0.31 },
        { x: 0.71, y: 0.69 },
      ])
    ).toBe(1);
  });

  it("penalise une zone manquee comme une erreur (0.5)", () => {
    expect(getQuestionScore(imageZoneQuestion, [{ x: 0.3, y: 0.3 }])).toBe(0.5);
  });

  it("penalise un clic hors de toute zone comme une erreur en plus", () => {
    expect(
      getQuestionScore(imageZoneQuestion, [
        { x: 0.3, y: 0.3 },
        { x: 0.7, y: 0.7 },
        { x: 0.9, y: 0.1 },
      ])
    ).toBe(0.5);
  });

  it("ne donne aucun point sans aucun clic", () => {
    expect(getQuestionScore(imageZoneQuestion, [])).toBe(0);
    expect(getQuestionScore(imageZoneQuestion, undefined)).toBe(0);
  });

  it("renvoie 0 si la question n'a aucune zone definie", () => {
    expect(
      getQuestionScore({ ...imageZoneQuestion, zones: [] }, [{ x: 0.3, y: 0.3 }])
    ).toBe(0);
  });
});

describe("ASSOCIATION", () => {
  const associationQuestion: Question = {
    id: 1,
    type: "ASSOCIATION",
    question: "Associez chaque symptôme à sa maladie",
    choix: ["Maladie X", "Maladie Y", "Maladie Z"],
    reponses: [],
    items: [
      { id: "item-1", label: "Symptôme A", correctAnswer: "Maladie X" },
      { id: "item-2", label: "Symptôme B", correctAnswer: "Maladie Y" },
      { id: "item-3", label: "Symptôme C", correctAnswer: "Maladie Z" },
      { id: "item-4", label: "Symptôme D", correctAnswer: "Maladie X" },
    ],
  };

  it("note proportionnellement au nombre d'items corrects", () => {
    expect(
      getQuestionScore(associationQuestion, {
        "item-1": "Maladie X",
        "item-2": "Maladie Y",
        "item-3": "Maladie Z",
        "item-4": "Maladie X",
      })
    ).toBe(1);

    expect(
      getQuestionScore(associationQuestion, {
        "item-1": "Maladie X",
        "item-2": "Maladie Z",
        "item-3": "Maladie Z",
        "item-4": "Maladie X",
      })
    ).toBe(0.75);
  });

  it("ne donne aucun point sans reponse", () => {
    expect(getQuestionScore(associationQuestion, undefined)).toBe(0);
    expect(getQuestionScore(associationQuestion, {})).toBe(0);
  });
});

describe("VALEUR_NUMERIQUE", () => {
  const numericQuestion: Question = {
    id: 1,
    type: "VALEUR_NUMERIQUE",
    question: "Quelle est la valeur ?",
    choix: [],
    reponses: [],
    numericRange: { min: 48, max: 49 },
  };

  it("accepte toute valeur dans l'intervalle inclus", () => {
    expect(getQuestionScore(numericQuestion, "48")).toBe(1);
    expect(getQuestionScore(numericQuestion, "49")).toBe(1);
    expect(getQuestionScore(numericQuestion, "48.5")).toBe(1);
    expect(getQuestionScore(numericQuestion, "48,5")).toBe(1);
  });

  it("refuse une valeur hors intervalle ou invalide", () => {
    expect(getQuestionScore(numericQuestion, "47.9")).toBe(0);
    expect(getQuestionScore(numericQuestion, "49.1")).toBe(0);
    expect(getQuestionScore(numericQuestion, "abc")).toBe(0);
    expect(getQuestionScore(numericQuestion, "")).toBe(0);
    expect(getQuestionScore(numericQuestion, undefined)).toBe(0);
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
