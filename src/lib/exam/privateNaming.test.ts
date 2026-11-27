import { describe, expect, it } from "vitest";
import { cleanPrivateName, compareNames, matchesSearch, renameExam } from "./privateNaming";

describe("compareNames", () => {
  it("classe les items par numéro : le 340 après le 35 et le 55", () => {
    const names = ["Item 340 : AVC", "Item 55 : Développement", "Item 34 : Suites", "Item 35 : Cycle"];

    expect(names.sort(compareNames)).toEqual([
      "Item 34 : Suites",
      "Item 35 : Cycle",
      "Item 55 : Développement",
      "Item 340 : AVC",
    ]);
  });
});

describe("matchesSearch", () => {
  const entry = { matiere: "Item 27 : Risques fœtaux", annee: 2026 };

  it("ignore les accents, la casse et l'ordre des mots", () => {
    expect(matchesSearch(entry, "FOETAUX 27")).toBe(true);
    expect(matchesSearch(entry, "item 2026")).toBe(true);
    expect(matchesSearch(entry, "   ")).toBe(true);
  });

  it("exige tous les mots", () => {
    expect(matchesSearch(entry, "risques avc")).toBe(false);
  });
});

describe("renommage", () => {
  it("nettoie le nom et refuse un nom vide ou trop long", () => {
    expect(cleanPrivateName("  Item 34 :   Suites ")).toBe("Item 34 : Suites");
    expect(cleanPrivateName("   ")).toBeNull();
    expect(cleanPrivateName("a".repeat(201))).toBeNull();
    expect(cleanPrivateName(12)).toBeNull();
  });

  it("met à jour le titre par défaut et garde un titre personnalisé", () => {
    const exam = { slug: "item-34", matiere: "Ancien", annee: 2026, title: "Ancien - 2026" };

    expect(renameExam(exam, "Nouveau")).toEqual({
      slug: "item-34",
      matiere: "Nouveau",
      annee: 2026,
      title: "Nouveau - 2026",
    });
    expect(renameExam({ ...exam, title: "Mon titre" }, "Nouveau").title).toBe("Mon titre");
  });
});
