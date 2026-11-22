import fs from "node:fs";
import path from "node:path";
import { ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder } from "discord.js";
import { BRAND, SITE, SITE_DIR } from "./config.js";
import { normalize, truncate } from "./util.js";

const QCM_DIR = path.join(SITE_DIR, "public", "data", "qcm");
const USABLE_TYPES = new Set(["QRU", "QRM"]); // les QROC / QRP ne se répondent pas avec des choix
const LETTERS = "ABCDEFGHIJ";

let catalogCache = { at: 0, entries: [] };

/** "A) Souffle" → "Souffle". */
export const cleanChoice = (text) => String(text).replace(/^\s*[A-J]\s*[).:-]\s*/, "").trim();

export function isUsable(q) {
  return !!q && USABLE_TYPES.has(q.type) && Array.isArray(q.choix) && q.choix.length >= 2 && q.choix.length <= LETTERS.length
    && Array.isArray(q.reponses) && q.reponses.length >= 1
    && q.reponses.every((r) => LETTERS.slice(0, q.choix.length).includes(String(r).toUpperCase()));
}

export const examKey = (entry) => entry.exam;

export function loadExam(exam) {
  if (!/^[a-z0-9_-]+$/i.test(exam)) return null; // le nom vient de la base : pas de chemin arbitraire
  try {
    return JSON.parse(fs.readFileSync(path.join(QCM_DIR, `${exam}.json`), "utf8"));
  } catch {
    return null;
  }
}

/**
 * Catalogue des questions exploitables, construit depuis les fichiers d'épreuves du site
 * (l'index.json peut être en retard sur les fichiers) et rafraîchi toutes les 30 minutes.
 * Chaque entrée : { exam, matiere, annee, ids: [id de question exploitable] }.
 */
export function loadCatalog() {
  if (Date.now() - catalogCache.at < 30 * 60_000 && catalogCache.entries.length) return catalogCache.entries;
  const entries = [];
  try {
    for (const file of fs.readdirSync(QCM_DIR)) {
      if (!file.endsWith(".json") || file === "index.json") continue;
      const exam = file.slice(0, -5);
      const data = loadExam(exam);
      const ids = (data?.questions ?? []).filter(isUsable).map((q) => q.id);
      if (ids.length) entries.push({ exam, matiere: data.matiere ?? exam, annee: data.annee, ids });
    }
  } catch {
    // dossier absent : catalogue vide
  }
  catalogCache = { at: Date.now(), entries };
  return entries;
}

export function listMatieres() {
  return [...new Set(loadCatalog().map((e) => e.matiere))].sort((a, b) => a.localeCompare(b, "fr"));
}

/**
 * Tire une question au hasard (optionnellement dans une matière), en évitant les `exclude` ("exam#id").
 * Renvoie { entry, exam, question } ou null.
 */
export function pickQuestion({ matiere, exclude = new Set() } = {}) {
  let entries = loadCatalog();
  if (matiere) {
    const wanted = normalize(matiere);
    entries = entries.filter((e) => normalize(e.matiere).includes(wanted));
  }
  const candidates = entries.flatMap((e) => e.ids.filter((id) => !exclude.has(`${e.exam}#${id}`)).map((id) => [e, id]));
  if (!candidates.length) {
    // Tout a déjà été posé : on retente sans exclusion.
    return exclude.size ? pickQuestion({ matiere }) : null;
  }
  const [entry, id] = candidates[Math.floor(Math.random() * candidates.length)];
  const question = loadExam(entry.exam)?.questions?.find((q) => q.id === id);
  return question ? { entry, exam: entry.exam, question } : null;
}

export const correctLetters = (q) => [...new Set(q.reponses.map((r) => String(r).toUpperCase()))].sort();

export function evaluate(given, correct) {
  const a = [...new Set(given)].sort();
  const b = [...new Set(correct)].sort();
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

const imageUrl = (src) => (typeof src === "string" && src ? (src.startsWith("http") ? src : `${SITE}${src.startsWith("/") ? "" : "/"}${src}`) : null);

/** Message Discord d'une question : embed + menu déroulant (multi-choix pour les QRM). */
export function buildQuestionMessage({ challengeId, title, entry, question, footerExtra }) {
  const multi = question.type === "QRM";
  const choices = question.choix.map((c, i) => `**${LETTERS[i]}** · ${truncate(cleanChoice(c), 350)}`).join("\n");
  const context = question.contexte ? `> ${truncate(question.contexte, 1200).replace(/\n/g, "\n> ")}\n\n` : "";

  const embed = new EmbedBuilder()
    .setColor(BRAND)
    .setTitle(truncate(title, 250))
    .setDescription(truncate(`${context}**${question.question}**\n\n${choices}`, 4000))
    .setFooter({ text: [`${entry.matiere} · ${entry.annee}`, multi ? "Plusieurs réponses possibles" : "Une seule réponse", footerExtra].filter(Boolean).join(" · ") });
  const img = imageUrl(question.image);
  if (img) embed.setImage(img);

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`qcm:${challengeId}`)
    .setPlaceholder(multi ? "Choisis toutes les bonnes réponses…" : "Choisis ta réponse…")
    .setMinValues(1)
    .setMaxValues(multi ? question.choix.length : 1)
    .addOptions(question.choix.map((c, i) => ({ label: `Réponse ${LETTERS[i]}`, description: truncate(cleanChoice(c), 100), value: LETTERS[i] })));

  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] };
}
