// Import d'annales completes depuis un fichier JSON (souvent genere par une IA).
// Logique pure, partagee entre l'apercu cote admin et la route d'import.

import type { ExamData, ExamFolder, FolderType, Question, QuestionType } from "@/types/exam";

export interface AnnaleSubject {
  slug: string;
  matiere: string;
}

export interface AnnaleImportError {
  /** Position de l'annale dans le fichier (a partir de 1). */
  index: number;
  message: string;
}

export interface AnnaleImportItem {
  slug: string;
  matiere: string;
  annee: number;
  examTitle?: string;
  semesterName?: string;
  /** Vrai si la matiere n'existe pas encore (sera creee a l'import). */
  newSubject: boolean;
  /** Vrai si une annale avec ce slug + annee existe deja. */
  exists: boolean;
  totalQuestions: number;
  exam: ExamData;
}

export interface AnnaleImportResult {
  valid: AnnaleImportItem[];
  errors: AnnaleImportError[];
}

// Nginx limite les requetes a 1 Mo en prod : une annale fait ~20-60 Ko.
export const ANNALES_IMPORT_MAX = 10;
export const ANNALES_IMPORT_MAX_QUESTIONS = 400;

// Types importables par JSON. IMAGE_ZONE est exclu : il demande des images televersees.
export const IMPORTABLE_QUESTION_TYPES: QuestionType[] = [
  "QRU",
  "QRM",
  "QRP",
  "QROC",
  "ASSOCIATION",
  "VALEUR_NUMERIQUE",
];

const FOLDER_TYPES: FolderType[] = ["DP", "SQI", "KFP"];
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

// Les IA entourent souvent le JSON de ```json ... ``` : on l'enleve avant de parser.
function stripCodeFence(raw: string) {
  const fenced = raw.trim().match(/^```[a-zA-Z]*\s*\n([\s\S]*?)\n?```$/);
  return fenced ? fenced[1] : raw.replace(/^﻿/, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

// Accepte : un tableau d'annales, { annales: [...] } (modele telechargeable) ou une annale seule.
export function extractAnnales(raw: string): unknown[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    throw new Error("Le fichier n'est pas un JSON valide.");
  }

  if (Array.isArray(parsed)) return parsed;
  if (isRecord(parsed)) {
    if (Array.isArray(parsed.annales)) return parsed.annales;
    if (Array.isArray(parsed.folders) || Array.isArray(parsed.questions)) return [parsed];
  }

  throw new Error('Le fichier doit contenir une liste d\'annales, ou un objet avec une cle "annales".');
}

/** Retire un prefixe "A)", "A.", "A -" deja present avant de remettre le format "A) ...". */
function formatChoice(raw: string, index: number) {
  const body = raw.replace(/^\s*[A-Za-z]\s*[).:\-–]\s+/, "").trim();
  return `${LETTERS[index]}) ${body}`;
}

function parseLetters(value: unknown): string[] | null {
  const list = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[\s,;]+/) : null;
  if (!list) return null;

  const letters = list
    .map((entry) => (typeof entry === "string" ? entry.trim().toUpperCase().replace(/[).]$/, "") : ""))
    .filter(Boolean);

  return letters.every((letter) => /^[A-Z]$/.test(letter)) ? [...new Set(letters)] : null;
}

function validateQuestion(
  record: Record<string, unknown>,
  id: number
): { question?: Question; error?: string } {
  const type = text(record.type).toUpperCase() as QuestionType;
  if (!IMPORTABLE_QUESTION_TYPES.includes(type)) {
    return {
      error: `type "${text(record.type) || "?"}" invalide (attendu : ${IMPORTABLE_QUESTION_TYPES.join(", ")}).`,
    };
  }

  const statement = text(record.question);
  if (!statement) return { error: 'champ "question" vide.' };

  const base: Question = {
    id,
    order: id,
    type,
    contexte: text(record.contexte),
    question: statement,
    choix: [],
    reponses: [],
    correctionExplanation: text(record.correction ?? record.correctionExplanation),
  };

  if (type === "QROC") {
    const answers = (Array.isArray(record.reponses) ? record.reponses : [record.reponses])
      .map(text)
      .filter(Boolean);
    if (answers.length === 0) return { error: "QROC : au moins une reponse acceptee dans \"reponses\"." };
    return { question: { ...base, reponses: answers } };
  }

  if (type === "VALEUR_NUMERIQUE") {
    const range = isRecord(record.numericRange) ? record.numericRange : null;
    const min = Number(range?.min);
    const max = Number(range?.max);
    if (!range || !Number.isFinite(min) || !Number.isFinite(max) || min > max) {
      return { error: 'VALEUR_NUMERIQUE : "numericRange" doit etre { "min": nombre, "max": nombre } avec min <= max.' };
    }
    return { question: { ...base, numericRange: { min, max } } };
  }

  const rawChoices = Array.isArray(record.choix) ? record.choix.map(text) : [];
  if (rawChoices.length < 2 || rawChoices.some((choice) => !choice)) {
    return { error: 'au moins 2 choix non vides dans "choix".' };
  }
  if (rawChoices.length > LETTERS.length) return { error: "trop de choix (26 maximum)." };

  if (type === "ASSOCIATION") {
    const rawItems = Array.isArray(record.items) ? record.items : [];
    if (rawItems.length === 0) return { error: 'ASSOCIATION : "items" vide.' };

    const items = [];
    for (const [position, rawItem] of rawItems.entries()) {
      const item = isRecord(rawItem) ? rawItem : {};
      const label = text(item.label);
      const correctAnswer = text(item.correctAnswer);
      if (!label) return { error: `ASSOCIATION : item ${position + 1} sans "label".` };
      if (!rawChoices.includes(correctAnswer)) {
        return {
          error: `ASSOCIATION : "correctAnswer" de l'item ${position + 1} doit etre exactement l'une des valeurs de "choix".`,
        };
      }
      items.push({ id: text(item.id) || `item-${position + 1}`, label, correctAnswer });
    }

    return { question: { ...base, choix: rawChoices, items } };
  }

  const reponses = parseLetters(record.reponses);
  if (!reponses || reponses.length === 0) {
    return { error: '"reponses" doit etre une liste de lettres, ex : ["A", "C"].' };
  }
  const outOfRange = reponses.find((letter) => LETTERS.indexOf(letter) >= rawChoices.length);
  if (outOfRange) return { error: `la reponse "${outOfRange}" ne correspond a aucun choix.` };
  if (type === "QRU" && reponses.length !== 1) {
    return { error: `QRU : exactement 1 bonne reponse (${reponses.length} donnees).` };
  }

  const question: Question = {
    ...base,
    choix: rawChoices.map(formatChoice),
    reponses: reponses.sort(),
  };

  if (type === "QRP") {
    const maxReponses = Number(record.maxReponses);
    if (!Number.isInteger(maxReponses) || maxReponses < 1 || maxReponses > rawChoices.length) {
      return { error: 'QRP : "maxReponses" doit etre un entier entre 1 et le nombre de choix.' };
    }
    question.maxReponses = maxReponses;
  }

  return { question };
}

function validateFolder(
  record: Record<string, unknown>,
  folderIndex: number,
  nextId: () => number
): { folder?: ExamFolder; errors: string[] } {
  const errors: string[] = [];
  const label = `dossier ${folderIndex + 1}`;

  const typeValue = text(record.type).toUpperCase() as FolderType;
  const type = FOLDER_TYPES.includes(typeValue) ? typeValue : "SQI";
  if (record.type !== undefined && !FOLDER_TYPES.includes(typeValue)) {
    errors.push(`${label} : type "${text(record.type)}" invalide (attendu : ${FOLDER_TYPES.join(", ")}).`);
  }

  const rawQuestions = Array.isArray(record.questions) ? record.questions : [];
  if (rawQuestions.length === 0) errors.push(`${label} : aucune question.`);

  const questions: Question[] = [];
  rawQuestions.forEach((rawQuestion, position) => {
    if (!isRecord(rawQuestion)) {
      errors.push(`${label}, question ${position + 1} : objet attendu.`);
      return;
    }
    const result = validateQuestion(rawQuestion, nextId());
    if (result.error) errors.push(`${label}, question ${position + 1} : ${result.error}`);
    else if (result.question) questions.push(result.question);
  });

  if (errors.length > 0) return { errors };

  return {
    errors,
    folder: {
      id: text(record.id) || `folder-${folderIndex + 1}`,
      type,
      title: text(record.title) || `${type} ${folderIndex + 1}`,
      description: text(record.description),
      order: folderIndex + 1,
      questions,
    },
  };
}

export function validateAnnales(
  items: unknown[],
  subjects: AnnaleSubject[],
  existing: { slug: string; annee: number }[] = []
): AnnaleImportResult {
  const bySlug = new Map(subjects.map((subject) => [subject.slug, subject]));
  const existingKeys = new Set(existing.map((entry) => `${entry.slug}|${entry.annee}`));
  const seen = new Set<string>();

  const valid: AnnaleImportItem[] = [];
  const errors: AnnaleImportError[] = [];

  if (items.length > ANNALES_IMPORT_MAX) {
    return {
      valid,
      errors: [{ index: 0, message: `Trop d'annales (${items.length}). Maximum ${ANNALES_IMPORT_MAX} par fichier.` }],
    };
  }

  items.forEach((item, position) => {
    const index = position + 1;
    const fail = (message: string) => errors.push({ index, message });

    if (!isRecord(item)) return fail("Ce n'est pas une annale (objet attendu).");

    const slug = text(item.slug).toLowerCase();
    if (!SLUG_PATTERN.test(slug)) {
      return fail(
        slug
          ? `slug "${slug}" invalide (minuscules, chiffres et tirets, ex : acv-anatomie-s3).`
          : 'Champ "slug" manquant.'
      );
    }

    const annee = Number(item.annee);
    if (!Number.isInteger(annee) || annee < 2000 || annee > 2100) {
      return fail('"annee" doit etre un entier entre 2000 et 2100.');
    }

    const known = bySlug.get(slug);
    const matiere = known?.matiere ?? text(item.matiere);
    if (!matiere) return fail(`Matiere inconnue "${slug}" : renseigner "matiere" pour la creer.`);

    const key = `${slug}|${annee}`;
    if (seen.has(key)) return fail(`Annale ${slug} ${annee} presente deux fois dans le fichier.`);

    const rawFolders = Array.isArray(item.folders)
      ? item.folders
      : Array.isArray(item.questions)
        ? [{ type: "SQI", title: "Questions", questions: item.questions }]
        : [];
    if (rawFolders.length === 0) return fail('Aucun dossier : "folders" est vide ou manquant.');

    let counter = 0;
    const folders: ExamFolder[] = [];
    const folderErrors: string[] = [];

    rawFolders.forEach((rawFolder, folderIndex) => {
      if (!isRecord(rawFolder)) {
        folderErrors.push(`dossier ${folderIndex + 1} : objet attendu.`);
        return;
      }
      const result = validateFolder(rawFolder, folderIndex, () => ++counter);
      folderErrors.push(...result.errors);
      if (result.folder) folders.push(result.folder);
    });

    if (folderErrors.length > 0) {
      folderErrors.slice(0, 8).forEach(fail);
      if (folderErrors.length > 8) fail(`... et ${folderErrors.length - 8} autre(s) erreur(s).`);
      return;
    }

    if (counter > ANNALES_IMPORT_MAX_QUESTIONS) {
      return fail(`Trop de questions (${counter}). Maximum ${ANNALES_IMPORT_MAX_QUESTIONS} par annale.`);
    }

    seen.add(key);
    const examTitle = text(item.examTitle) || undefined;

    valid.push({
      slug,
      matiere,
      annee,
      examTitle,
      semesterName: text(item.semesterName) || undefined,
      newSubject: !known,
      exists: existingKeys.has(key),
      totalQuestions: counter,
      exam: {
        matiere,
        slug,
        annee,
        title: `${matiere} - ${annee}`,
        total_questions: counter,
        folders,
        questions: [],
      },
    });
  });

  return { valid, errors };
}

export function annaleKey(entry: { slug: string; annee: number }) {
  return `${entry.slug}|${entry.annee}`;
}

export function buildAnnalesTemplate(subjects: AnnaleSubject[]) {
  const first = subjects[0];

  return {
    instructions: [
      'Remplir la liste "annales" : une annale = une matiere + une annee, avec ses dossiers de questions.',
      'Les elements de "exemples" montrent le format et ne sont jamais importes.',
      '"slug" : obligatoire, minuscules/chiffres/tirets. Utiliser un slug de "matieres_existantes" pour ajouter a une matiere, ou en inventer un nouveau avec "matiere" (nom complet).',
      '"annee" : obligatoire, entier (ex : 2025). "examTitle" et "semesterName" : optionnels.',
      '"folders" : liste de dossiers. "type" = "DP" (dossier progressif), "SQI" (questions isolees) ou "KFP". Chaque dossier a "title" et "questions".',
      'Types de question : "QRU" (1 seule bonne reponse), "QRM" (plusieurs), "QRP" (QRM avec "maxReponses"), "QROC" (reponse courte), "VALEUR_NUMERIQUE", "ASSOCIATION". Pas de questions sur image.',
      '"choix" : textes sans lettre (A), B)... sont ajoutees automatiquement). "reponses" : lettres des bonnes reponses, ex : ["A", "C"].',
      '"contexte" (vignette clinique) et "correction" (explication) : optionnels. Ne pas mettre d\'"id" : ils sont generes.',
      "Repondre uniquement avec ce JSON complet, sans texte autour.",
    ],
    matieres_existantes: subjects.map((subject) => ({ slug: subject.slug, matiere: subject.matiere })),
    exemples: [
      {
        slug: first?.slug ?? "acv-anatomie-s3",
        matiere: first?.matiere ?? "Appareil cardio-vasculaire – Anatomie",
        annee: 2026,
        examTitle: "Session 1",
        semesterName: "Semestre 3",
        folders: [
          {
            type: "DP",
            title: "DP 1 – Douleur thoracique",
            description: "Patient de 65 ans admis pour une douleur thoracique constrictive.",
            questions: [
              {
                type: "QRM",
                contexte: "Concernant la vascularisation coronaire :",
                question: "Parmi les propositions suivantes, laquelle ou lesquelles sont exactes ?",
                choix: [
                  "L'artere interventriculaire anterieure nait de la coronaire gauche.",
                  "La coronaire droite vascularise le noeud sinusal dans la majorite des cas.",
                  "Le sinus coronaire se jette dans l'atrium gauche.",
                  "Le tronc commun gauche donne l'artere circonflexe.",
                  "La coronaire droite nait du sinus aortique gauche.",
                ],
                reponses: ["A", "B", "D"],
                correction: "Le sinus coronaire se jette dans l'atrium droit ; la coronaire droite nait du sinus droit.",
              },
              {
                type: "QRU",
                question: "Quelle structure separe les deux atria ?",
                choix: ["Septum interatrial", "Septum interventriculaire", "Valve mitrale", "Crista terminalis"],
                reponses: ["A"],
              },
            ],
          },
          {
            type: "SQI",
            title: "SQI 1",
            questions: [
              {
                type: "QRP",
                question: "Choisir au maximum 2 reponses.",
                choix: ["Reponse 1", "Reponse 2", "Reponse 3", "Reponse 4"],
                reponses: ["B", "C"],
                maxReponses: 2,
              },
              { type: "QROC", question: "Nom de la valve entre OG et VG ?", reponses: ["mitrale", "valve mitrale"] },
              {
                type: "VALEUR_NUMERIQUE",
                question: "Frequence cardiaque normale au repos (bpm) ?",
                numericRange: { min: 60, max: 100 },
              },
              {
                type: "ASSOCIATION",
                question: "Associer chaque vaisseau a sa destination.",
                choix: ["Atrium droit", "Atrium gauche"],
                items: [
                  { label: "Veine cave superieure", correctAnswer: "Atrium droit" },
                  { label: "Veines pulmonaires", correctAnswer: "Atrium gauche" },
                ],
              },
            ],
          },
        ],
      },
    ],
    annales: [],
  };
}
