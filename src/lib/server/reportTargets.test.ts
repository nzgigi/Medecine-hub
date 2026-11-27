import { describe, expect, it } from "vitest";
import { findReportTarget, type ExamQuestion } from "./reportTargets";

const index = [
  { matiere: "Cardiologie", slug: "cardiologie", annee: 2025 },
  { matiere: "Cardiologie", slug: "cardiologie-s7", annee: 2025 },
  { matiere: "Anglais", slug: "anglais-s8", annee: 2025 },
];

const exams: Record<string, ExamQuestion[]> = {
  cardiologie: [{ id: 1, question: "Ancienne question" }],
  "cardiologie-s7": [
    { id: 1, question: "Souffle   systolique ?" },
    { id: 2, question: "ECG ?" },
  ],
  "anglais-s8": [{ id: 1, question: "Énoncé corrigé depuis" }],
};

const find = (matiere: string, questionId: number, questionText: string | null) =>
  findReportTarget(
    { matiere, annee: 2025, questionId, questionText },
    index,
    (slug) => exams[slug] ?? []
  );

describe("findReportTarget", () => {
  it("départage deux épreuves de même nom grâce à l'énoncé", () => {
    expect(find("Cardiologie", 1, "Souffle systolique ?")).toEqual({
      slug: "cardiologie-s7",
      annee: 2025,
    });
  });

  it("accepte un candidat unique même si l'énoncé a changé", () => {
    expect(find("Anglais", 1, "Énoncé avec une faute")?.slug).toBe("anglais-s8");
    expect(find("Cardiologie", 2, null)?.slug).toBe("cardiologie-s7");
  });

  it("ne devine pas en cas d'ambiguïté ou de question introuvable", () => {
    expect(find("Cardiologie", 1, "Énoncé inconnu")).toBeNull();
    expect(find("Cardiologie", 99, "ECG ?")).toBeNull();
    expect(find("Matière inconnue", 1, null)).toBeNull();
  });
});
