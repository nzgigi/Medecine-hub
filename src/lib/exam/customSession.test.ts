import { describe, expect, it } from "vitest";
import type { Question } from "@/types/exam";
import {
  allocateSlots,
  drawQuestionRefs,
  formatTimeLimit,
  type ExamSource,
  type LoadExamQuestions,
} from "./customSession";

function question(id: number): Question {
  return { id, type: "QRU", question: `Question ${id}`, choix: ["A) x"], reponses: ["A"] };
}

/** Épreuves factices : `sizes[slug]` questions numérotées 1..n. */
function fakeLoader(sizes: Record<string, number>, failing: string[] = []): LoadExamQuestions {
  return async (slug) => {
    if (failing.includes(slug)) return null;
    return Array.from({ length: sizes[slug] ?? 0 }, (_, i) => question(i + 1));
  };
}

/** Générateur pseudo-aléatoire reproductible (LCG). */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe("allocateSlots", () => {
  it("répartit exactement `count` tirages", () => {
    const slots = allocateSlots([10, 20, 30], 25, seeded(1));

    expect(slots.reduce((a, b) => a + b, 0)).toBe(25);
  });

  it("ne tire jamais dans une épreuve de poids nul", () => {
    const slots = allocateSlots([0, 10, 0], 50, seeded(2));

    expect(slots).toEqual([0, 50, 0]);
  });

  it("est proportionnel au nombre de questions", () => {
    const slots = allocateSlots([10, 90], 10_000, seeded(3));

    expect(slots[1] / 10_000).toBeGreaterThan(0.87);
    expect(slots[1] / 10_000).toBeLessThan(0.93);
  });

  it("renvoie des zéros sans poids exploitable", () => {
    expect(allocateSlots([], 5)).toEqual([]);
    expect(allocateSlots([0, 0], 5)).toEqual([0, 0]);
  });
});

describe("drawQuestionRefs", () => {
  const sources: ExamSource[] = [
    { slug: "cardio", annee: 2024, total_questions: 30 },
    { slug: "pneumo", annee: 2023, total_questions: 20 },
  ];

  it("tire le nombre demandé de questions distinctes", async () => {
    const refs = await drawQuestionRefs(sources, 25, fakeLoader({ cardio: 30, pneumo: 20 }), seeded(4));
    const keys = refs.map((ref) => `${ref.slug}|${ref.annee}|${ref.questionId}`);

    expect(refs).toHaveLength(25);
    expect(new Set(keys).size).toBe(25);
  });

  it("garde l'empreinte du texte pour détecter une épreuve modifiée", async () => {
    const [ref] = await drawQuestionRefs(sources, 1, fakeLoader({ cardio: 30, pneumo: 20 }), seeded(5));

    expect(ref.fingerprint).toBe(`question ${ref.questionId}`);
  });

  it("renvoie tout le pool quand on en demande plus qu'il n'y en a", async () => {
    const refs = await drawQuestionRefs(sources, 100, fakeLoader({ cardio: 30, pneumo: 20 }), seeded(6));

    expect(refs).toHaveLength(50);
  });

  it("complète depuis une autre épreuve quand une ne charge pas", async () => {
    const refs = await drawQuestionRefs(
      sources,
      15,
      fakeLoader({ cardio: 30, pneumo: 20 }, ["cardio"]),
      seeded(7)
    );

    expect(refs).toHaveLength(15);
    expect(refs.every((ref) => ref.slug === "pneumo")).toBe(true);
  });

  it("complète quand l'index annonce plus de questions que le fichier n'en contient", async () => {
    const refs = await drawQuestionRefs(sources, 20, fakeLoader({ cardio: 3, pneumo: 20 }), seeded(8));

    expect(refs).toHaveLength(20);
  });

  it("ne charge que les épreuves tirées", async () => {
    const loaded: string[] = [];
    const many: ExamSource[] = Array.from({ length: 200 }, (_, i) => ({
      slug: `exam-${i}`,
      annee: 2024,
      total_questions: 20,
    }));

    await drawQuestionRefs(many, 10, async (slug) => {
      loaded.push(slug);
      return Array.from({ length: 20 }, (_, i) => question(i + 1));
    }, seeded(9));

    expect(loaded.length).toBeLessThanOrEqual(10);
  });

  it("renvoie une liste vide sans épreuve exploitable", async () => {
    expect(await drawQuestionRefs([], 10, fakeLoader({}))).toEqual([]);
    expect(
      await drawQuestionRefs([{ slug: "x", annee: 2024, total_questions: 0 }], 10, fakeLoader({}))
    ).toEqual([]);
  });
});

describe("formatTimeLimit", () => {
  it("formate les durées", () => {
    expect(formatTimeLimit(null)).toBe("Sans chrono");
    expect(formatTimeLimit(30)).toBe("30 min");
    expect(formatTimeLimit(60)).toBe("1 h");
    expect(formatTimeLimit(90)).toBe("1 h 30");
  });
});
