import fs from "node:fs";
import { ActivityType, EmbedBuilder } from "discord.js";
import { BRAND, CH, DAILY_HOUR, DIGEST_HOUR, DIGEST_MINUTE, GUILD_ID, RECAP_HOUR, SITE } from "./config.js";
import { ADMIN_LOG_PATH, botDb, kvGet, kvSet, siteDb } from "./db.js";
import { postChallenge, recapChallenge, todaysDaily } from "./challenges.js";
import { reportError } from "./errors.js";
import { onlineNow, presencePeak24h, siteCounts, topMatieres24h } from "./sitedata.js";
import { flushSessions } from "./study.js";
import { parisNow, truncate } from "./util.js";

const fmt = (n) => new Intl.NumberFormat("fr-FR").format(n);
const MILESTONES = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];

/** Plus grand palier atteint (≤ count), ou 0. */
export const reachedMilestone = (count) => MILESTONES.filter((m) => m <= count).pop() ?? 0;

// ── Planning quotidien ───────────────────────────────────────────────────────
let ticking = false;

async function tick(client) {
  if (ticking) return;
  ticking = true;
  try {
    const now = parisNow();

    // 18 h : défi du jour (rattrapage possible jusqu'à 23 h si le bot était arrêté).
    if (now.hour >= DAILY_HOUR && now.hour < 23 && kvGet("daily_day") !== now.ymd) {
      kvSet("daily_day", now.ymd); // avant l'envoi : jamais deux défis, même si l'envoi échoue
      if (!todaysDaily()) await postChallenge(client, { kind: "daily" });
    }

    // 8 h : correction publique des défis des jours précédents.
    if (now.hour >= RECAP_HOUR) {
      const open = botDb.prepare("SELECT * FROM challenges WHERE kind = 'daily' AND closed = 0 AND day < ?").all(now.ymd);
      for (const challenge of open) await recapChallenge(client, challenge);
    }

    // 8 h 30 : résumé pour l'équipe.
    const digestDue = now.hour > DIGEST_HOUR || (now.hour === DIGEST_HOUR && now.minute >= DIGEST_MINUTE);
    if (digestDue && kvGet("digest_day") !== now.ymd) {
      kvSet("digest_day", now.ymd);
      await postDigest(client);
    }
  } finally {
    ticking = false;
  }
}

async function postDigest(client) {
  const counts = siteCounts();
  const guild = client.guilds.cache.get(GUILD_ID);
  const embed = new EmbedBuilder().setColor(BRAND).setTitle("☀️ Résumé des dernières 24 h").setTimestamp();

  if (counts) {
    const top = topMatieres24h();
    embed.addFields(
      { name: "Inscriptions", value: `**${fmt(counts.newUsers24h)}** nouvelles · ${fmt(counts.users)} au total`, inline: true },
      { name: "Séances", value: `**${fmt(counts.attempts24h)}** par ${fmt(counts.activeUsers24h)} étudiant·es`, inline: true },
      { name: "Pic de visiteurs", value: `**${fmt(presencePeak24h() ?? 0)}** en ligne`, inline: true },
      { name: "Signalements de QCM", value: `**${fmt(counts.reports24h)}** nouveaux · **${fmt(counts.reportsPending)}** en attente`, inline: true },
    );
    if (top.length) embed.addFields({ name: "Matières les plus travaillées", value: top.map((t, i) => `${i + 1}. ${t.matiere} (${fmt(t.n)})`).join("\n") });
    if (counts.reportsPending > 0) embed.setDescription(`⚠️ ${counts.reportsPending} signalement${counts.reportsPending > 1 ? "s" : ""} de QCM à traiter dans le [panneau admin](${SITE}/admin).`);
  } else {
    embed.setDescription("Base du site introuvable : impossible de calculer les chiffres.");
  }
  if (guild) embed.setFooter({ text: `${fmt(guild.memberCount)} membres sur Discord` });

  const channel = await client.channels.fetch(CH.site);
  await channel.send({ embeds: [embed] });
}

// ── Signalements de QCM → équipe ─────────────────────────────────────────────
async function pollReports(client) {
  const db = siteDb();
  if (!db) return;
  const last = kvGet("reports_last_id");
  if (last === null) {
    kvSet("reports_last_id", db.prepare("SELECT COALESCE(MAX(id), 0) AS m FROM question_reports").get().m);
    return; // premier lancement : on ne rejoue pas l'historique
  }
  const rows = db.prepare("SELECT * FROM question_reports WHERE id > ? ORDER BY id LIMIT 20").all(Number(last));
  if (!rows.length) return;
  const channel = await client.channels.fetch(CH.site);

  for (const r of rows) {
    const embed = new EmbedBuilder()
      .setColor(0xe67e22)
      .setTitle(`🐞 Signalement de QCM #${r.id}`)
      .setDescription(truncate(r.message, 1500))
      .addFields(
        { name: "Épreuve", value: `${r.matiere} · ${r.annee}`, inline: true },
        { name: "Question", value: `n° ${r.question_id}`, inline: true },
        { name: "Signalé par", value: r.user_name ?? "anonyme", inline: true },
      )
      .setTimestamp(new Date(r.created_at));
    if (r.question_text) embed.addFields({ name: "Énoncé", value: `> ${truncate(r.question_text, 600).replace(/\n/g, "\n> ")}` });
    await channel.send({
      embeds: [embed],
      components: [{ type: 1, components: [
        { type: 2, style: 3, label: "Marquer résolu", emoji: { name: "✅" }, custom_id: `report:resolve:${r.id}` },
        { type: 2, style: 5, label: "Panneau admin", url: `${SITE}/admin` },
      ] }],
    });
    kvSet("reports_last_id", r.id);
  }
}

// ── Journal d'administration du site → #logs ─────────────────────────────────
async function pollAdminLog(client) {
  if (!fs.existsSync(ADMIN_LOG_PATH)) return;
  let entries;
  try {
    entries = JSON.parse(fs.readFileSync(ADMIN_LOG_PATH, "utf8"));
  } catch {
    return; // fichier en cours d'écriture : on réessaiera
  }
  if (!Array.isArray(entries) || !entries.length) return;

  const last = kvGet("adminlog_at");
  const newest = entries.reduce((max, e) => (e.at > max ? e.at : max), "");
  if (last === null) {
    kvSet("adminlog_at", newest);
    return;
  }
  const fresh = entries.filter((e) => e.at > last).sort((a, b) => (a.at < b.at ? -1 : 1)).slice(-10);
  if (!fresh.length) return;

  const channel = await client.channels.fetch(CH.logs);
  for (const e of fresh) {
    await channel.send({
      embeds: [new EmbedBuilder().setColor(0x3498db).setTitle(`🛡️ ${truncate(e.action, 200)}`)
        .setDescription(e.details ? truncate(e.details, 1000) : null)
        .setFooter({ text: `Admin du site · ${e.actor?.username ?? "inconnu"}` }).setTimestamp(new Date(e.at))],
    });
  }
  kvSet("adminlog_at", newest);
}

// ── Jalons de la communauté ──────────────────────────────────────────────────
async function announceMilestone(client, key, count, build, channelId) {
  const reached = reachedMilestone(count);
  const last = kvGet(key);
  if (last === null) return kvSet(key, reached); // premier lancement : on ne fête pas rétroactivement
  if (reached <= Number(last)) return;
  kvSet(key, reached);
  const channel = await client.channels.fetch(channelId);
  await channel.send({ embeds: [new EmbedBuilder().setColor(BRAND).setDescription(build(reached))] });
}

async function checkMilestones(client) {
  const counts = siteCounts();
  if (counts) {
    await announceMilestone(client, "milestone_site", counts.users, (m) => `🎉 **${fmt(m)} étudiant·es** ont maintenant un compte sur [Medecine Hub](${SITE}). Merci à toute la communauté !`, CH.annonces);
  }
  const guild = client.guilds.cache.get(GUILD_ID);
  if (guild) {
    await announceMilestone(client, "milestone_discord", guild.memberCount, (m) => `🎉 On est **${fmt(m)}** sur le serveur ! Bienvenue aux nouveaux et nouvelles.`, CH.general);
  }
}

// ── Statut du bot ────────────────────────────────────────────────────────────
let statusIndex = 0;
async function updatePresence(client) {
  const online = await onlineNow();
  const statuses = [
    { name: "medecinehub.fr", type: ActivityType.Watching },
    { name: "/qcm pour s'entraîner", type: ActivityType.Playing },
    online ? { name: `${online} étudiant·es en ligne`, type: ActivityType.Watching } : { name: "les révisions", type: ActivityType.Watching },
  ];
  client.user.setPresence({ activities: [statuses[statusIndex++ % statuses.length]], status: "online" });
}

export function startJobs(client) {
  const every = (name, ms, fn) => {
    const run = async () => {
      try {
        await fn(client);
      } catch (error) {
        await reportError(name, error);
      }
    };
    setTimeout(run, 5000);
    setInterval(run, ms);
  };
  every("planning", 30_000, tick);
  every("signalements", 60_000, pollReports);
  every("journal admin", 60_000, pollAdminLog);
  every("jalons", 5 * 60_000, checkMilestones);
  every("statut", 5 * 60_000, updatePresence);
  setInterval(() => flushSessions(), 5 * 60_000);
}


