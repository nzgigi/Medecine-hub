import { describe, expect, it } from "vitest";
import { buildAnnalesTemplate, extractAnnales, validateAnnales } from "./annalesImport";

const subjects = [{ slug: "acv-anatomie-s3", matiere: "Appareil cardio-vasculaire – Anatomie" }];

const annale = {
  slug: "acv-anatomie-s3",
  annee: 2026,
  folders: [
    {
      type: "DP",
      title: "DP 1",
      questions: [
        { type: "QRM", question: "Q1", choix: ["A. un", "deux", "B) trois"], reponses: ["a", "C"] },
        { type: "QRU", question: "Q2", choix: ["x", "y"], reponses: ["B"] },
      ],
    },
    { questions: [{ type: "QROC", question: "Q3", reponses: ["mitrale"] }] },
  ],
};

describe("champs facultatifs de filtre", () => {
  const withMeta = {
    ...annale,
    folders: [
      {
        type: "DP",
        title: "DP 1",
        item: "340 – Accidents vasculaires cérébraux",
        questions: [
          { type: "QRU", question: "Q1", choix: ["x", "y"], reponses: ["A"], rang: "b" },
          { type: "QRU", question: "Q2", choix: ["x", "y"], reponses: ["A"] },
        ],
      },
    ],
  };

  it("importe et normalise rang et item", () => {
    const { valid, errors } = validateAnnales([withMeta], subjects);
    expect(errors).toEqual([]);
    const folder = valid[0].exam.folders[0];
    expect(folder.item).toBe("340 – Accidents vasculaires cérébraux");
    expect(folder.questions[0]).toMatchObject({ rang: "B" });
    expect(folder.questions[1]).not.toHaveProperty("rang");
  });

  it("un fichier sans ces champs s'importe sans les ajouter", () => {
    const { valid, errors } = validateAnnales([annale], subjects);
    expect(errors).toEqual([]);
    expect(valid[0].exam.folders[0]).not.toHaveProperty("item");
    expect(valid[0].exam.folders[0].questions[0]).not.toHaveProperty("rang");
  });

  it("refuse une valeur invalide avec un message clair", () => {
    const bad = JSON.parse(JSON.stringify(withMeta));
    bad.folders[0].questions[0].rang = "C";
    expect(validateAnnales([bad], subjects).errors.map((e) => e.message).join(" ")).toMatch(/rang/);
  });
});

describe("extractAnnales", () => {
  it("lit un tableau, { annales }, une annale seule et du JSON entoure de ```json", () => {
    expect(extractAnnales(JSON.stringify([annale]))).toHaveLength(1);
    expect(extractAnnales(JSON.stringify({ exemples: [annale, annale], annales: [annale] }))).toHaveLength(1);
    expect(extractAnnales(JSON.stringify(annale))).toHaveLength(1);
    expect(extractAnnales("```json\n" + JSON.stringify([annale]) + "\n```")).toHaveLength(1);
  });

  it("refuse un JSON invalide ou sans annales", () => {
    expect(() => extractAnnales("nope")).toThrow(/JSON valide/);
    expect(() => extractAnnales('{"foo": 1}')).toThrow(/annales/);
  });
});

describe("validateAnnales", () => {
  it("normalise : ids, lettres des choix, reponses triees, dossiers par defaut", () => {
    const { valid, errors } = validateAnnales([annale], subjects);
    expect(errors).toEqual([]);

    const [item] = valid;
    expect(item.matiere).toBe(subjects[0].matiere);
    expect(item.totalQuestions).toBe(3);
    expect(item.exam.folders.map((folder) => folder.type)).toEqual(["DP", "SQI"]);

    const [q1, q2] = item.exam.folders[0].questions;
    expect(q1.id).toBe(1);
    expect(q2.id).toBe(2);
    expect(q1.choix).toEqual(["A) un", "B) deux", "C) trois"]);
    expect(q1.reponses).toEqual(["A", "C"]);
    expect(item.exam.folders[1].questions[0].id).toBe(3);
  });

  it("signale une matiere nouvelle et une annale deja existante", () => {
    const fresh = validateAnnales([{ ...annale, slug: "nouveau", matiere: "Nouveau" }], subjects);
    expect(fresh.valid[0].newSubject).toBe(true);

    const existing = validateAnnales([annale], subjects, [{ slug: "acv-anatomie-s3", annee: 2026 }]);
    expect(existing.valid[0].exists).toBe(true);
  });

  it("rejette les annales invalides avec un message precis", () => {
    const bad = (patch: object) => validateAnnales([{ ...annale, ...patch }], subjects).errors[0]?.message ?? "";

    expect(bad({ slug: "Mauvais Slug" })).toMatch(/slug/);
    expect(bad({ annee: "abc" })).toMatch(/annee/);
    expect(bad({ slug: "inconnu" })).toMatch(/Matiere inconnue/);
    expect(bad({ folders: [] })).toMatch(/Aucun dossier/);
    expect(
      bad({ folders: [{ questions: [{ type: "QRU", question: "Q", choix: ["a", "b"], reponses: ["A", "B"] }] }] })
    ).toMatch(/QRU/);
    expect(
      bad({ folders: [{ questions: [{ type: "QRM", question: "Q", choix: ["a", "b"], reponses: ["Z"] }] }] })
    ).toMatch(/Z/);
    expect(bad({ folders: [{ questions: [{ type: "IMAGE_ZONE", question: "Q" }] }] })).toMatch(/type/);
  });

  it("detecte un doublon dans le fichier", () => {
    expect(validateAnnales([annale, annale], subjects).errors[0].message).toMatch(/deux fois/);
  });

  it("valide les types speciaux", () => {
    const folders = [
      {
        questions: [
          { type: "QRP", question: "Q", choix: ["a", "b", "c"], reponses: ["A"], maxReponses: 2 },
          { type: "VALEUR_NUMERIQUE", question: "Q", numericRange: { min: 1, max: 2 } },
          {
            type: "ASSOCIATION",
            question: "Q",
            choix: ["X", "Y"],
            items: [{ label: "l", correctAnswer: "X" }],
          },
        ],
      },
    ];
    expect(validateAnnales([{ ...annale, folders }], subjects).errors).toEqual([]);

    const badRange = [{ questions: [{ type: "VALEUR_NUMERIQUE", question: "Q", numericRange: { min: 3, max: 2 } }] }];
    expect(validateAnnales([{ ...annale, folders: badRange }], subjects).errors).not.toEqual([]);
  });

  it("le modele telechargeable est lui-meme importable une fois mis dans annales", () => {
    const template = buildAnnalesTemplate(subjects);
    const { valid, errors } = validateAnnales(template.exemples, subjects);
    expect(errors).toEqual([]);
    expect(valid).toHaveLength(1);
  });
});
