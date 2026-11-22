import { describe, expect, it } from "vitest";
import type { ExamData, Question } from "@/types/exam";
import {
  applyFilters,
  applyPrivateOutcomes,
  buildPool,
  buildTrainingBlocks,
  countBlockQuestions,
  EMPTY_FILTERS,
  filtersFromParams,
  filtersToParams,
  parsePrivateHistory,
  privateQuestionKey,
  statusOf,
  type PrivateOutcome,
} from "./privateTraining";

function q(id: number, text: string, extra: Partial<Question> = {}): Question {
  return { id, type: "QRU", question: text, choix: ["A) x", "B) y"], reponses: ["A"], ...extra };
}

function exam(): ExamData {
  return {
    matiere: "Neurologie",
    slug: "neuro",
    annee: 2026,
    total_questions: 6,
    folders: [
      {
        id: "f1", type: "DP", title: "DP AVC", item: "340 – AVC", order: 1,
        description: "Homme de 70 ans",
        questions: [q(1, "DP q1", { rang: "A" }), q(2, "DP q2", { rang: "B", difficulte: "difficile" })],
      },
      { id: "f2", type: "SQI", title: "SQI 1", order: 2, questions: [q(3, "S1"), q(4, "S2", { difficulte: "facile" }), q(5, "S3")] },
      { id: "f3", type: "KFP", title: "KFP 1", order: 3, questions: [q(6, "K1")] },
    ],
  };
}

const outcome = (key: string, correct: boolean): PrivateOutcome => ({
  key, slug: "neuro", annee: 2026, matiere: "Neurologie", folderTitle: "DP AVC", questionText: "Texte", correct,
});

describe("privateQuestionKey", () => {
  it("ne dépend pas de la casse ni des espaces, mais du slug, du dossier et de l'énoncé", () => {
    expect(privateQuestionKey("neuro", "DP AVC", "Quel  signe ?")).toBe(privateQuestionKey("neuro", " dp avc ", "quel signe ?"));
    expect(privateQuestionKey("neuro", "DP AVC", "A")).not.toBe(privateQuestionKey("neuro", "DP 2", "A"));
    expect(privateQuestionKey("neuro", "DP AVC", "A")).not.toBe(privateQuestionKey("cardio", "DP AVC", "A"));
  });

  it("survit à un réimport où les ids ont été renumérotés", () => {
    const before = buildPool([exam()]);
    const shifted = exam();
    shifted.folders[0].questions = [
      q(99, "Nouvelle question"),
      ...shifted.folders[0].questions.map((x) => ({ ...x, id: x.id + 10 })),
    ];
    const afterKeys = buildPool([shifted]).map((p) => p.key);
    for (const { key } of before) expect(afterKeys).toContain(key);
  });

  it("donne des clés distinctes à deux énoncés identiques d'un même dossier", () => {
    const e = exam();
    e.folders[1].questions = [q(3, "Doublon"), q(4, "Doublon")];
    const keys = buildPool([e]).filter((p) => p.folderId === "f2").map((p) => p.key);
    expect(new Set(keys).size).toBe(2);
  });
});

describe("historique et statut", () => {
  it("rater entre dans les erreurs, réussir une fois en sort, rater à nouveau y remet", () => {
    let h = applyPrivateOutcomes({}, [outcome("k", false)], "t1");
    expect(statusOf(h, "k")).toBe("erreurs");
    h = applyPrivateOutcomes(h, [outcome("k", true)], "t2");
    expect(statusOf(h, "k")).toBe("reussies");
    h = applyPrivateOutcomes(h, [outcome("k", false)], "t3");
    expect(statusOf(h, "k")).toBe("erreurs");
    expect(h.k.attempts).toBe(3);
    expect(h.k.wrongCount).toBe(2);
    expect(statusOf(h, "inconnue")).toBe("jamais");
  });

  it("lit un stockage corrompu sans planter", () => {
    expect(parsePrivateHistory("{pas du json")).toEqual({});
    expect(parsePrivateHistory(JSON.stringify([1]))).toEqual({});
    expect(parsePrivateHistory(null)).toEqual({});
  });
});

describe("filtres", () => {
  const pool = buildPool([exam()]);

  it("sans filtre, tout passe", () => {
    expect(applyFilters(pool, EMPTY_FILTERS, {})).toHaveLength(6);
  });

  it("filtre seul et combiné", () => {
    expect(applyFilters(pool, { ...EMPTY_FILTERS, type: "SQI" }, {})).toHaveLength(3);
    expect(applyFilters(pool, { ...EMPTY_FILTERS, item: "340 – AVC" }, {})).toHaveLength(2);
    expect(applyFilters(pool, { ...EMPTY_FILTERS, rang: "B" }, {})).toHaveLength(1);
    expect(applyFilters(pool, { ...EMPTY_FILTERS, difficulte: "facile", type: "SQI" }, {})).toHaveLength(1);
    expect(applyFilters(pool, { ...EMPTY_FILTERS, difficulte: "facile", type: "DP" }, {})).toHaveLength(0);
  });

  it("filtre par statut", () => {
    const h = applyPrivateOutcomes({}, [outcome(pool[0].key, false), outcome(pool[1].key, true)], "t");
    expect(applyFilters(pool, { ...EMPTY_FILTERS, statut: "erreurs" }, h)).toHaveLength(1);
    expect(applyFilters(pool, { ...EMPTY_FILTERS, statut: "reussies" }, h)).toHaveLength(1);
    expect(applyFilters(pool, { ...EMPTY_FILTERS, statut: "jamais" }, h)).toHaveLength(4);
  });

  it("passe par l'URL sans perte, et ignore les valeurs inconnues", () => {
    const filters = { ...EMPTY_FILTERS, matiere: "neuro", rang: "A" as const, statut: "erreurs" as const };
    expect(filtersFromParams(filtersToParams(filters))).toEqual(filters);
    expect(filtersFromParams(new URLSearchParams("rang=Z&statut=x")).rang).toBe("");
  });
});

describe("tirage", () => {
  const pool = buildPool([exam()]);

  it("garde chaque DP/KFP en un bloc ordonné et tire les SQI une par une", () => {
    const blocks = buildTrainingBlocks(pool, "aleatoire", () => 0.3);
    expect(countBlockQuestions(blocks)).toBe(6);
    expect(blocks).toHaveLength(1 + 3 + 1);

    const dp = blocks.find((b) => b.folder.type === "DP")!;
    expect(dp.questions.map((x) => x.question.question)).toEqual(["DP q1", "DP q2"]);
    expect(dp.folder.description).toBe("Homme de 70 ans");
    expect(blocks.filter((b) => b.folder.type === "SQI").every((b) => b.questions.length === 1)).toBe(true);
  });

  it("l'ordre du fichier est conservé", () => {
    const blocks = buildTrainingBlocks(pool, "fichier");
    expect(blocks.flatMap((b) => b.questions.map((x) => x.question.question))).toEqual([
      "DP q1", "DP q2", "S1", "S2", "S3", "K1",
    ]);
  });

  it("mélange réellement les SQI (pas de regroupement par dossier)", () => {
    const orders = new Set<string>();
    for (let i = 0; i < 30; i++) {
      orders.add(buildTrainingBlocks(pool, "aleatoire").map((b) => b.questions[0].question.question).join(","));
    }
    expect(orders.size).toBeGreaterThan(5);
  });

  it("un filtre qui garde une partie d'un DP la garde dans l'ordre", () => {
    const part = applyFilters(pool, { ...EMPTY_FILTERS, rang: "B" }, {});
    const blocks = buildTrainingBlocks(part, "aleatoire");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].questions[0].question.question).toBe("DP q2");
  });
});
