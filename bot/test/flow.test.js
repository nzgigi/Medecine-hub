import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Base du bot isolée : ne touche jamais bot/data.
process.env.BOT_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "mh-bot-test-"));

const { botDb } = await import("../src/db.js");
const { pickQuestion, correctLetters } = await import("../src/qcm.js");
const { streakOf, dailyLeaderboard, personalStats } = await import("../src/challenges.js");
const { handleInteraction } = await import("../src/interactions.js");
const study = await import("../src/study.js");
const { reachedMilestone } = await import("../src/jobs.js");
const { parisNow } = await import("../src/util.js");

function insertChallenge(kind, day = parisNow().ymd, closed = 0) {
  const pick = pickQuestion();
  const info = botDb.prepare(
    "INSERT INTO challenges (kind, day, channel_id, exam, question_id, correct, closed, created_at) VALUES (?, ?, 'c', ?, ?, ?, ?, ?)"
  ).run(kind, day, pick.exam, pick.question.id, JSON.stringify(correctLetters(pick.question)), closed, new Date().toISOString());
  return { id: Number(info.lastInsertRowid), correct: correctLetters(pick.question) };
}

/** Fausse interaction de menu déroulant qui capture la réponse. */
function selectInteraction(challengeId, userId, values) {
  const replies = [];
  return {
    replies,
    customId: `qcm:${challengeId}`,
    values,
    user: { id: userId },
    isChatInputCommand: () => false,
    isAutocomplete: () => false,
    isStringSelectMenu: () => true,
    isButton: () => false,
    reply: async (payload) => replies.push(payload),
  };
}

const title = (i) => i.replies[0].embeds?.[0]?.data?.title ?? i.replies[0].content;

test("bonne réponse, mauvaise réponse et doublon", async () => {
  const { id, correct } = insertChallenge("free");

  const good = selectInteraction(id, "u1", correct);
  await handleInteraction(good);
  assert.equal(title(good), "✅ Correct");

  const again = selectInteraction(id, "u1", correct);
  await handleInteraction(again);
  assert.match(title(again), /déjà répondu/);

  const bad = selectInteraction(id, "u2", ["Z"]);
  await handleInteraction(bad);
  assert.equal(title(bad), "❌ Raté");
  assert.equal(bad.replies[0].flags, 64); // éphémère

  assert.deepEqual(personalStats("u1").free, { played: 1, correct: 1 });
  assert.deepEqual(personalStats("u2").free, { played: 1, correct: 0 });
});

test("un défi clos refuse les réponses", async () => {
  const { id, correct } = insertChallenge("daily", "2026-01-01", 1);
  const i = selectInteraction(id, "u3", correct);
  await handleInteraction(i);
  assert.match(title(i), /terminé/);
});

test("streakOf : le défi du jour ouvert ne casse pas la série", () => {
  const dailies = [{ id: 5, closed: 0 }, { id: 4, closed: 1 }, { id: 3, closed: 1 }, { id: 2, closed: 1 }];
  assert.equal(streakOf(dailies, new Set([4, 3])), 2);
  assert.equal(streakOf(dailies, new Set([5, 4, 3, 2])), 4);
  assert.equal(streakOf(dailies, new Set([4, 2])), 1);
  assert.equal(streakOf(dailies, new Set([5, 3])), 1);
  assert.equal(streakOf([], new Set()), 0);
});

test("classement des défis", async () => {
  const a = insertChallenge("daily");
  const b = insertChallenge("daily");
  for (const [c, user, ok] of [[a, "top", true], [b, "top", true], [a, "mid", true], [b, "mid", false]]) {
    await handleInteraction(selectInteraction(c.id, user, ok ? c.correct : ["Z"]));
  }
  const board = dailyLeaderboard(30, 10).filter((r) => ["top", "mid"].includes(r.userId));
  assert.deepEqual(board.map((r) => [r.userId, r.correct, r.played]), [["top", 2, 2], ["mid", 1, 2]]);
});

test("temps d'étude : sessions, semaine et classement", () => {
  const t0 = new Date("2026-09-16T10:00:00Z").getTime();
  study.startSession("s1", t0);
  study.stopSession("s1", t0 + 90 * 60_000);
  study.startSession("s2", t0);
  study.stopSession("s2", t0 + 30 * 60_000);
  study.startSession("s3", t0 + 3_600_000); // encore en cours
  const now = t0 + 2 * 3_600_000;

  assert.equal(study.weeklySeconds("s1", now), 90 * 60);
  const board = study.weeklyLeaderboard(10, now);
  assert.deepEqual(board.map((r) => r.userId), ["s1", "s3", "s2"]);
  assert.equal(board[1].seconds, 3600);
  study.stopAllSessions();
});

test("jalons", () => {
  assert.equal(reachedMilestone(3), 0);
  assert.equal(reachedMilestone(10), 10);
  assert.equal(reachedMilestone(260), 250);
  assert.equal(reachedMilestone(1000), 1000);
});
