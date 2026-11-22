import test from "node:test";
import assert from "node:assert/strict";
import { addDays, formatDuration, parisNow, truncate, weekStart } from "../src/util.js";
import { cleanChoice, correctLetters, evaluate, isUsable, pickQuestion } from "../src/qcm.js";

test("formatDuration", () => {
  assert.equal(formatDuration(20), "< 1 min");
  assert.equal(formatDuration(600), "10 min");
  assert.equal(formatDuration(3600), "1 h");
  assert.equal(formatDuration(5460), "1 h 31");
});

test("weekStart renvoie le lundi (Paris)", () => {
  assert.equal(weekStart(new Date("2026-09-19T10:00:00Z")), "2026-09-14"); // samedi
  assert.equal(weekStart(new Date("2026-09-14T00:30:00+02:00")), "2026-09-14"); // lundi
  assert.equal(weekStart(new Date("2026-09-13T23:30:00Z")), "2026-09-14"); // dimanche 23:30 UTC = lundi 01:30 Paris
});

test("parisNow gère l'heure d'été et d'hiver", () => {
  assert.deepEqual(parisNow(new Date("2026-07-01T16:00:00Z")), { ymd: "2026-07-01", hour: 18, minute: 0 });
  assert.deepEqual(parisNow(new Date("2026-01-15T17:00:00Z")), { ymd: "2026-01-15", hour: 18, minute: 0 });
});

test("addDays et truncate", () => {
  assert.equal(addDays("2026-02-28", 1), "2026-03-01");
  assert.equal(truncate("abcdef", 4), "abc…");
  assert.equal(truncate("abc", 4), "abc");
});

test("evaluate exige l'ensemble exact des réponses", () => {
  assert.equal(evaluate(["A", "C"], ["C", "A"]), true);
  assert.equal(evaluate(["A"], ["A", "C"]), false);
  assert.equal(evaluate(["A", "B", "C"], ["A", "C"]), false);
});

test("cleanChoice et correctLetters", () => {
  assert.equal(cleanChoice("A) Souffle systolique"), "Souffle systolique");
  assert.equal(cleanChoice("E ) Truc"), "Truc");
  assert.deepEqual(correctLetters({ reponses: ["c", "A", "A"] }), ["A", "C"]);
});

test("isUsable écarte les questions sans choix", () => {
  assert.equal(isUsable({ type: "QRU", choix: ["A) x", "B) y"], reponses: ["A"] }), true);
  assert.equal(isUsable({ type: "QROC", choix: [], reponses: [] }), false);
  assert.equal(isUsable({ type: "QRU", choix: ["A) x", "B) y"], reponses: ["D"] }), false);
});

test("pickQuestion tire une question exploitable dans les données du site", () => {
  const picked = pickQuestion();
  assert.ok(picked, "aucune question trouvée (données du site absentes ?)");
  assert.ok(isUsable(picked.question));
});
