import { EmbedBuilder } from "discord.js";
import { BRAND, CH, ROLE, SITE } from "./config.js";
import { botDb } from "./db.js";
import { buildQuestionMessage, cleanChoice, correctLetters, evaluate, loadExam, pickQuestion } from "./qcm.js";
import { addDays, parisNow, truncate } from "./util.js";

const LETTERS = "ABCDEFGHIJ";

/** Questions déjà posées ces 90 derniers jours ("exam#id"), pour ne pas se répéter. */
function recentKeys(days = 90) {
  const since = addDays(parisNow().ymd, -days);
  const rows = botDb.prepare("SELECT exam, question_id FROM challenges WHERE day >= ?").all(since);
  return new Set(rows.map((r) => `${r.exam}#${r.question_id}`));
}

export const getChallenge = (id) => botDb.prepare("SELECT * FROM challenges WHERE id = ?").get(id);
export const todaysDaily = () => botDb.prepare("SELECT * FROM challenges WHERE kind = 'daily' AND day = ? ORDER BY id DESC LIMIT 1").get(parisNow().ymd);

export function questionOf(challenge) {
  return loadExam(challenge.exam)?.questions?.find((q) => q.id === challenge.question_id) ?? null;
}

/** Poste un nouveau QCM dans le salon ; renvoie la ligne `challenges` ou null (aucune question / envoi impossible). */
export async function postChallenge(client, { kind, channelId = CH.defis, matiere } = {}) {
  const pick = pickQuestion({ matiere, exclude: recentKeys() });
  if (!pick) return null;

  const today = parisNow().ymd;
  const info = botDb.prepare(
    "INSERT INTO challenges (kind, day, channel_id, exam, question_id, correct, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(kind, today, channelId, pick.exam, pick.question.id, JSON.stringify(correctLetters(pick.question)), new Date().toISOString());
  const id = Number(info.lastInsertRowid);

  const daily = kind === "daily";
  const message = buildQuestionMessage({
    challengeId: id,
    title: daily ? `🎯 Défi du jour · ${pick.entry.matiere}` : `🩺 QCM · ${pick.entry.matiere}`,
    entry: pick.entry,
    question: pick.question,
    footerExtra: daily ? "Correction demain à 8 h" : undefined,
  });

  try {
    const channel = await client.channels.fetch(channelId);
    const sent = await channel.send({
      ...message,
      content: daily ? `<@&${ROLE.pingDefi}> le défi du jour est là !` : undefined,
      allowedMentions: { roles: daily ? [ROLE.pingDefi] : [] },
    });
    botDb.prepare("UPDATE challenges SET message_id = ? WHERE id = ?").run(sent.id, id);
    return getChallenge(id);
  } catch (error) {
    botDb.prepare("DELETE FROM challenges WHERE id = ?").run(id);
    throw error;
  }
}

/** Enregistre la réponse d'un membre. { already: true } s'il a déjà répondu. */
export function recordAnswer(challenge, userId, given) {
  const correct = JSON.parse(challenge.correct);
  const isCorrect = evaluate(given, correct);
  const result = botDb.prepare(
    "INSERT INTO answers (challenge_id, user_id, given, is_correct, answered_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING"
  ).run(challenge.id, userId, JSON.stringify(given), isCorrect ? 1 : 0, new Date().toISOString());
  return { already: result.changes === 0, isCorrect, correct };
}

/** Série de défis du jour consécutifs auxquels le membre a participé (le défi en cours ne casse pas la série). */
export function streakFor(userId) {
  const dailies = botDb.prepare("SELECT id, closed FROM challenges WHERE kind = 'daily' ORDER BY id DESC LIMIT 400").all();
  const answered = new Set(
    botDb.prepare("SELECT challenge_id FROM answers WHERE user_id = ?").all(userId).map((r) => r.challenge_id)
  );
  return streakOf(dailies, answered);
}

/** Parcourt les défis du plus récent au plus ancien ; s'arrête au premier défi clos sans réponse. */
export function streakOf(dailies, answered) {
  let streak = 0;
  for (let i = 0; i < dailies.length; i++) {
    const d = dailies[i];
    if (answered.has(d.id)) streak++;
    else if (i === 0 && !d.closed) continue; // défi du jour encore ouvert : on ne sanctionne pas
    else break;
  }
  return streak;
}

/** Classement des défis du jour sur les `days` derniers jours. */
export function dailyLeaderboard(days = 30, limit = 10) {
  const since = addDays(parisNow().ymd, -days);
  const rows = botDb.prepare(`
    SELECT a.user_id, SUM(a.is_correct) AS correct, COUNT(*) AS played
    FROM answers a JOIN challenges c ON c.id = a.challenge_id
    WHERE c.kind = 'daily' AND c.day >= ?
    GROUP BY a.user_id
    ORDER BY correct DESC, played ASC
    LIMIT ?
  `).all(since, limit);
  return rows.map((r) => ({ userId: r.user_id, correct: Number(r.correct), played: Number(r.played), streak: streakFor(r.user_id) }));
}

export function personalStats(userId) {
  const row = botDb.prepare(`
    SELECT COUNT(*) AS played, COALESCE(SUM(is_correct), 0) AS correct FROM answers a
    JOIN challenges c ON c.id = a.challenge_id WHERE a.user_id = ? AND c.kind = 'daily'
  `).get(userId);
  const free = botDb.prepare(`
    SELECT COUNT(*) AS played, COALESCE(SUM(is_correct), 0) AS correct FROM answers a
    JOIN challenges c ON c.id = a.challenge_id WHERE a.user_id = ? AND c.kind = 'free'
  `).get(userId);
  return { daily: { played: Number(row.played), correct: Number(row.correct) }, free: { played: Number(free.played), correct: Number(free.correct) }, streak: streakFor(userId) };
}

/** Lignes "A · texte" des bonnes réponses. */
export function correctionLines(question, letters) {
  return letters.map((l) => `**${l}** · ${truncate(cleanChoice(question.choix[LETTERS.indexOf(l)] ?? ""), 200)}`).join("\n");
}

/** Publie la correction d'un défi du jour terminé, retire le menu et clôt le défi. */
export async function recapChallenge(client, challenge) {
  const question = questionOf(challenge);
  const channel = await client.channels.fetch(challenge.channel_id).catch(() => null);
  const answers = botDb.prepare("SELECT user_id, is_correct FROM answers WHERE challenge_id = ?").all(challenge.id);
  const correct = JSON.parse(challenge.correct);

  if (channel && question) {
    const ok = answers.filter((a) => a.is_correct).length;
    const percent = answers.length ? Math.round((100 * ok) / answers.length) : 0;
    const streaks = answers.map((a) => ({ id: a.user_id, streak: streakFor(a.user_id) })).filter((s) => s.streak >= 3)
      .sort((a, b) => b.streak - a.streak).slice(0, 5);

    const embed = new EmbedBuilder()
      .setColor(BRAND)
      .setTitle("✅ Correction du défi d'hier")
      .setDescription(
        `**${truncate(question.question, 300)}**\n\n${correctionLines(question, correct)}\n\n` +
        (answers.length
          ? `**${answers.length}** participant·e${answers.length > 1 ? "s" : ""} · **${percent} %** de réussite`
          : "Personne n'a participé cette fois.")
      );
    if (streaks.length) embed.addFields({ name: "🔥 Séries en cours", value: streaks.map((s) => `<@${s.id}> · ${s.streak} jours`).join("\n") });
    embed.addFields({ name: "Continuer à s'entraîner", value: `[Ouvrir Medecine Hub](${SITE})` });

    await channel.send({ embeds: [embed], reply: challenge.message_id ? { messageReference: challenge.message_id, failIfNotExists: false } : undefined, allowedMentions: { parse: [] } });
    if (challenge.message_id) {
      const original = await channel.messages.fetch(challenge.message_id).catch(() => null);
      await original?.edit({ components: [] }).catch(() => {});
    }
  }
  botDb.prepare("UPDATE challenges SET closed = 1 WHERE id = ?").run(challenge.id);
}
