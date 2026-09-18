import { describe, expect, it } from "vitest";
import {
  applyOutcomes,
  groupByExam,
  mistakeKey,
  parseMistakeStore,
  questionFingerprint,
  sortByPriority,
  type MistakeEntry,
  type MistakeStore,
  type QuestionOutcome,
} from "./mistakes";
import { shuffle } from "./practiceSession";

const NOW = "2026-09-19T10:00:00.000Z";

function outcome(overrides: Partial<QuestionOutcome> = {}): QuestionOutcome {
  return {
    slug: "cardiologie",
    annee: 2024,
    questionId: 3,
    matiere: "Cardiologie",
    questionText: "Quel est le traitement de première intention ?",
    correct: false,
    ...overrides,
  };
}

function entry(overrides: Partial<MistakeEntry> = {}): MistakeEntry {
  return {
    slug: "cardiologie",
    annee: 2024,
    questionId: 3,
    matiere: "Cardiologie",
    fingerprint: "x",
    wrongCount: 1,
    lastWrongAt: NOW,
    ...overrides,
  };
}

describe("applyOutcomes", () => {
  it("ajoute une question ratée", () => {
    const store = applyOutcomes({}, [outcome()], NOW);
    const saved = store[mistakeKey(outcome())];

    expect(saved.wrongCount).toBe(1);
    expect(saved.lastWrongAt).toBe(NOW);
    expect(saved.fingerprint).toBe("quel est le traitement de première intention ?");
  });

  it("cumule les échecs successifs sur la même question", () => {
    const first = applyOutcomes({}, [outcome()], NOW);
    const second = applyOutcomes(first, [outcome()], "2026-09-20T10:00:00.000Z");

    expect(Object.keys(second)).toHaveLength(1);
    expect(second[mistakeKey(outcome())].wrongCount).toBe(2);
    expect(second[mistakeKey(outcome())].lastWrongAt).toBe("2026-09-20T10:00:00.000Z");
  });

  it("retire la question quand elle est enfin réussie", () => {
    const first = applyOutcomes({}, [outcome()], NOW);
    const second = applyOutcomes(first, [outcome({ correct: true })], NOW);

    expect(second).toEqual({});
  });

  it("ignore une réussite sur une question qui n'était pas dans la liste", () => {
    expect(applyOutcomes({}, [outcome({ correct: true })], NOW)).toEqual({});
  });

  it("distingue deux épreuves qui ont chacune une question 3", () => {
    const store = applyOutcomes(
      {},
      [outcome(), outcome({ annee: 2025 }), outcome({ slug: "pneumologie" })],
      NOW
    );

    expect(Object.keys(store)).toHaveLength(3);
  });

  it("ne modifie pas le store d'origine", () => {
    const original: MistakeStore = {};
    applyOutcomes(original, [outcome()], NOW);

    expect(original).toEqual({});
  });
});

describe("questionFingerprint", () => {
  it("ignore la casse et les espaces multiples, et se limite à 60 caractères", () => {
    expect(questionFingerprint("  Quel   EST le\nTraitement ")).toBe("quel est le traitement");
    expect(questionFingerprint("a".repeat(200))).toHaveLength(60);
  });
});

describe("sortByPriority", () => {
  it("met les plus ratées d'abord, puis les moins récentes", () => {
    const sorted = sortByPriority([
      entry({ questionId: 1, wrongCount: 1, lastWrongAt: "2026-09-19T00:00:00.000Z" }),
      entry({ questionId: 2, wrongCount: 3, lastWrongAt: "2026-09-19T00:00:00.000Z" }),
      entry({ questionId: 3, wrongCount: 1, lastWrongAt: "2026-09-10T00:00:00.000Z" }),
    ]);

    expect(sorted.map((item) => item.questionId)).toEqual([2, 3, 1]);
  });
});

describe("groupByExam", () => {
  it("regroupe par épreuve, plus nombreuses d'abord, avec la dernière erreur", () => {
    const groups = groupByExam([
      entry({ questionId: 1, lastWrongAt: "2026-09-01T00:00:00.000Z" }),
      entry({ questionId: 2, lastWrongAt: "2026-09-05T00:00:00.000Z" }),
      entry({ slug: "pneumologie", matiere: "Pneumologie", annee: 2023, questionId: 1 }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({ slug: "cardiologie", count: 2, lastWrongAt: "2026-09-05T00:00:00.000Z" });
    expect(groups[1]).toMatchObject({ slug: "pneumologie", count: 1 });
  });
});

describe("parseMistakeStore", () => {
  it("relit un store valide", () => {
    const store = applyOutcomes({}, [outcome()], NOW);

    expect(parseMistakeStore(JSON.stringify(store))).toEqual(store);
  });

  it("tolère un contenu absent, corrompu ou de mauvaise forme", () => {
    expect(parseMistakeStore(null)).toEqual({});
    expect(parseMistakeStore("pas du json")).toEqual({});
    expect(parseMistakeStore("[1,2]")).toEqual({});
    expect(parseMistakeStore('{"a":{"slug":1}}')).toEqual({});
  });

  it("écarte les entrées invalides sans perdre les valides", () => {
    const valid = entry();
    const raw = JSON.stringify({ ok: valid, cassee: { slug: "x" } });

    expect(Object.values(parseMistakeStore(raw))).toEqual([valid]);
  });
});

describe("shuffle", () => {
  it("garde les mêmes éléments sans toucher au tableau d'origine", () => {
    const original = [1, 2, 3, 4, 5];
    const result = shuffle(original);

    expect([...result].sort()).toEqual(original);
    expect(original).toEqual([1, 2, 3, 4, 5]);
  });

  it("est déterministe avec un générateur fixé", () => {
    expect(shuffle([1, 2, 3, 4], () => 0)).toEqual(shuffle([1, 2, 3, 4], () => 0));
  });
});
