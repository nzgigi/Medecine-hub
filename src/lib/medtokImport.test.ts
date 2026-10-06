import { describe, expect, it } from "vitest";
import { buildMedtokTemplate, extractMedtokCards, validateMedtokCards } from "./medtokImport";

const subjects = [
  { slug: "acv-anatomie-s3", matiere: "Appareil cardio-vasculaire – Anatomie" },
  { slug: "ad-anatomie-s4", matiere: "Appareil digestif – Anatomie" },
];

const card = {
  slug: "acv-anatomie-s3",
  question: "Concernant le coeur :",
  proposition: "Il a quatre cavites.",
  isTrue: true,
};

describe("extractMedtokCards", () => {
  it("lit un tableau, un objet { cards } et du JSON entoure de ```json", () => {
    expect(extractMedtokCards(JSON.stringify([card]))).toHaveLength(1);
    expect(extractMedtokCards(JSON.stringify({ exemples: [card, card], cards: [card] }))).toHaveLength(1);
    expect(extractMedtokCards("```json\n" + JSON.stringify([card]) + "\n```")).toHaveLength(1);
  });

  it("refuse un JSON invalide ou sans liste de cartes", () => {
    expect(() => extractMedtokCards("pas du json")).toThrow(/JSON valide/);
    expect(() => extractMedtokCards('{"foo": 1}')).toThrow(/cards/);
  });
});

describe("validateMedtokCards", () => {
  it("normalise les cartes valides et resout la matiere", () => {
    const result = validateMedtokCards(
      [
        { ...card, contexte: "  Vignette ", correction: "Oui." },
        { matiere: "appareil digestif – anatomie", question: "Q", proposition: "P", isTrue: "faux" },
      ],
      subjects
    );

    expect(result.errors).toEqual([]);
    expect(result.valid).toEqual([
      {
        matiere: "Appareil cardio-vasculaire – Anatomie",
        slug: "acv-anatomie-s3",
        contexte: "Vignette",
        question: "Concernant le coeur :",
        proposition: "Il a quatre cavites.",
        isTrue: true,
        correctionExplanation: "Oui.",
      },
      expect.objectContaining({ slug: "ad-anatomie-s4", isTrue: false }),
    ]);
  });

  it("signale les erreurs avec le numero de carte", () => {
    const result = validateMedtokCards(
      [
        { ...card, slug: "inconnu" },
        { ...card, proposition: "" },
        { ...card, isTrue: "peut-etre" },
        "texte",
      ],
      subjects
    );

    expect(result.valid).toHaveLength(0);
    expect(result.errors.map((error) => error.index)).toEqual([1, 2, 3, 4]);
    expect(result.errors[0].message).toContain("inconnu");
  });

  it("ignore les doublons du fichier et ceux deja presents", () => {
    const result = validateMedtokCards(
      [card, { ...card, proposition: "Il a QUATRE  cavités." }, { ...card, proposition: "Autre" }],
      subjects,
      [{ slug: "acv-anatomie-s3", question: "Concernant le coeur :", proposition: "Autre" }]
    );

    expect(result.valid).toHaveLength(1);
    expect(result.duplicates).toBe(2);
  });
});

describe("buildMedtokTemplate", () => {
  it("donne un modele importable qui n'importe pas ses exemples", () => {
    const template = buildMedtokTemplate(subjects);
    const items = extractMedtokCards(JSON.stringify(template));

    expect(template.matieres_autorisees).toHaveLength(2);
    expect(items).toEqual([]);
    expect(validateMedtokCards(template.exemples, subjects).valid).toHaveLength(2);
  });
});
