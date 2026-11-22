import { ChannelType, EmbedBuilder, Events } from "discord.js";
import { CH, GUILD_ID, ROLE } from "./config.js";
import { reportError } from "./errors.js";
import { handleInteraction } from "./interactions.js";
import { isStudyChannel, startSession, stopSession } from "./study.js";
import { truncate } from "./util.js";

const safe = (where, fn) => async (...args) => {
  try {
    await fn(...args);
  } catch (error) {
    await reportError(where, error);
  }
};

const unix = (date) => Math.floor(new Date(date).getTime() / 1000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Forums : accueil des posts et messages de statut ─────────────────────────
const FORUM_WELCOME = {
  [CH.support]:
    "Merci pour ton message 🙏 L'équipe a été prévenue et te répond ici dès que possible.\n" +
    "Pour aller plus vite : dis-nous ce que tu faisais, ce qui s'est passé, et ajoute une capture d'écran si tu peux.",
  [CH.corrections]:
    "Merci pour ce signalement ! On vérifie la question et on met le tag à jour dès que c'est fait.\n" +
    "Si tu as une source (cours, référentiel, recommandation), ajoute-la ici : ça accélère la vérification.",
  [CH.suggestions]: "Merci pour l'idée ! Les autres membres peuvent voter avec 👍 ou 👎, et l'équipe la lira avec attention.",
};

const TAG_STATUS = {
  résolu: { text: "✅ Ce post est marqué comme **résolu**. Écris ici pour le rouvrir si besoin.", archive: true },
  confirmée: { text: "✅ **Erreur confirmée** : la correction sera appliquée sur le site. Merci pour ta vigilance !" },
  rejetée: { text: "🚫 Après vérification, la correction du site est **maintenue**. Merci d'avoir vérifié avec nous !" },
  planifiée: { text: "🗓️ Bonne nouvelle : cette idée est **planifiée**." },
  livrée: { text: "🚀 C'est **en ligne** ! Merci pour l'idée, dis-nous ce que tu en penses." },
  refusée: { text: "🚫 Cette idée n'est **pas retenue** pour le moment. Merci de l'avoir proposée !" },
};

async function onThreadCreate(thread, newlyCreated) {
  if (!newlyCreated || thread.parent?.type !== ChannelType.GuildForum) return;
  const parentId = thread.parentId;
  const welcome = FORUM_WELCOME[parentId];
  if (!welcome && parentId !== CH.entraide) return;

  await sleep(1500); // laisse Discord finir de créer le message d'ouverture

  if (parentId === CH.suggestions) {
    const starter = await thread.fetchStarterMessage().catch(() => null);
    await starter?.react("👍").catch(() => {});
    await starter?.react("👎").catch(() => {});
  }
  if (welcome) await thread.send({ content: welcome, allowedMentions: { parse: [] } });

  // Prévenir l'équipe (support et corrections uniquement : les autres forums sont publics et vivants).
  if (parentId === CH.support || parentId === CH.corrections) {
    const tags = thread.appliedTags.map((id) => thread.parent.availableTags.find((t) => t.id === id)?.name).filter(Boolean);
    const isBug = tags.includes("Bug");
    const staff = await thread.client.channels.fetch(CH.staff);
    const embed = new EmbedBuilder()
      .setColor(isBug ? 0xe74c3c : 0x4e8f6c)
      .setTitle(`${parentId === CH.support ? "🎫 Nouveau ticket" : "🛠️ Nouveau signalement de QCM"}`)
      .setDescription(`**[${truncate(thread.name, 200)}](${thread.url})**\npar <@${thread.ownerId}>${tags.length ? ` · ${tags.join(", ")}` : ""}`)
      .setTimestamp();
    await staff.send({ content: isBug ? `<@&${ROLE.mod}> bug signalé` : undefined, embeds: [embed], allowedMentions: { roles: isBug ? [ROLE.mod] : [], parse: [] } });
  }
}

async function onThreadUpdate(oldThread, newThread) {
  if (newThread.parent?.type !== ChannelType.GuildForum) return;
  const added = newThread.appliedTags.filter((id) => !oldThread.appliedTags.includes(id));
  for (const id of added) {
    const name = newThread.parent.availableTags.find((t) => t.id === id)?.name?.toLowerCase();
    const status = name && TAG_STATUS[name];
    if (!status) continue;
    await newThread.send({ content: status.text, allowedMentions: { parse: [] } });
    if (status.archive) await newThread.setArchived(true).catch(() => {});
  }
}

// ── Vocal : temps d'étude ─────────────────────────────────────────────────────
function onVoiceState(oldState, newState) {
  const userId = newState.id;
  if (newState.member?.user?.bot) return;
  const was = isStudyChannel(oldState.channelId);
  const now = isStudyChannel(newState.channelId);
  if (!was && now) startSession(userId);
  else if (was && !now) stopSession(userId);
}

// ── Arrivées, départs, alerte anti-raid ───────────────────────────────────────
const recentJoins = [];
const RAID_WINDOW_MS = 60_000;
const RAID_THRESHOLD = 6;
let lastRaidAlert = 0;

async function onMemberAdd(member) {
  if (member.guild.id !== GUILD_ID) return;
  const logs = await member.client.channels.fetch(CH.logs);
  const youngAccount = Date.now() - member.user.createdTimestamp < 3 * 86_400_000;
  await logs.send({
    embeds: [new EmbedBuilder().setColor(youngAccount ? 0xe67e22 : 0x2ecc71)
      .setDescription(`➕ ${member} · compte créé <t:${unix(member.user.createdAt)}:R>${youngAccount ? " ⚠️ très récent" : ""}`)
      .setTimestamp()],
    allowedMentions: { parse: [] },
  });

  const now = Date.now();
  recentJoins.push({ at: now, id: member.id, young: youngAccount });
  while (recentJoins.length && now - recentJoins[0].at > RAID_WINDOW_MS) recentJoins.shift();

  if (recentJoins.length >= RAID_THRESHOLD && now - lastRaidAlert > 10 * 60_000) {
    lastRaidAlert = now;
    const staff = await member.client.channels.fetch(CH.staff);
    const young = recentJoins.filter((j) => j.young).length;
    await staff.send({
      content: `<@&${ROLE.mod}>`,
      embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("🚨 Arrivées en rafale")
        .setDescription(`**${recentJoins.length}** personnes ont rejoint en moins d'une minute (dont **${young}** avec un compte de moins de 3 jours).\nSi ce n'est pas normal, active « Suspendre les invitations » dans les paramètres du serveur.`)
        .setTimestamp()],
      allowedMentions: { roles: [ROLE.mod] },
    });
  }
}

async function onMemberRemove(member) {
  if (member.guild.id !== GUILD_ID) return;
  const logs = await member.client.channels.fetch(CH.logs);
  const since = member.joinedTimestamp ? ` · sur le serveur depuis <t:${unix(member.joinedAt)}:R>` : "";
  await logs.send({
    embeds: [new EmbedBuilder().setColor(0x95a5a6).setDescription(`➖ **${member.user.tag}** a quitté${since}`).setTimestamp()],
    allowedMentions: { parse: [] },
  });
}

export function registerEvents(client) {
  client.on(Events.InteractionCreate, (i) => handleInteraction(i));
  client.on(Events.ThreadCreate, safe("forum:création", onThreadCreate));
  client.on(Events.ThreadUpdate, safe("forum:mise à jour", onThreadUpdate));
  client.on(Events.VoiceStateUpdate, safe("vocal", onVoiceState));
  client.on(Events.GuildMemberAdd, safe("arrivée", onMemberAdd));
  client.on(Events.GuildMemberRemove, safe("départ", onMemberRemove));
  client.on(Events.Error, (error) => reportError("client", error));
  client.on(Events.ShardDisconnect, (event) => console.warn(`[gateway] déconnecté (code ${event.code})`));
  client.on(Events.ShardResume, () => console.log("[gateway] reconnecté"));
}
