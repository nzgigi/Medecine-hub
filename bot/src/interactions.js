import { EmbedBuilder, MessageFlags } from "discord.js";
import { SITE } from "./config.js";
import { commandMap } from "./commands/index.js";
import { correctionLines, getChallenge, questionOf, recordAnswer, streakFor } from "./challenges.js";
import { resolveReport } from "./db.js";
import { reportError } from "./errors.js";
import { isStaff } from "./perm.js";

const ephemeral = (payload) => ({ ...(typeof payload === "string" ? { content: payload } : payload), flags: MessageFlags.Ephemeral });

async function onQcmAnswer(interaction) {
  const challenge = getChallenge(Number(interaction.customId.split(":")[1]));
  if (!challenge) return interaction.reply(ephemeral("Ce QCM n'existe plus."));
  if (challenge.closed) return interaction.reply(ephemeral("Ce défi est terminé : la correction a été publiée."));

  const question = questionOf(challenge);
  if (!question) return interaction.reply(ephemeral("Je ne retrouve plus cette question, désolé."));

  const result = recordAnswer(challenge, interaction.user.id, interaction.values);
  if (result.already) return interaction.reply(ephemeral("Tu as déjà répondu à ce QCM : une seule tentative par personne."));

  const given = [...interaction.values].sort().join(", ");
  const lines = [result.isCorrect ? "**Bonne réponse !**" : `**Pas tout à fait.** Tu as répondu **${given}**.`];
  lines.push(`${result.isCorrect ? "Rappel" : "La bonne réponse"} :\n${correctionLines(question, result.correct)}`);
  if (challenge.kind === "daily") {
    const streak = streakFor(interaction.user.id);
    lines.push(streak >= 2 ? `🔥 Série : **${streak} jours** de suite. Reviens demain !` : "Reviens demain pour le prochain défi !");
  }

  const embed = new EmbedBuilder().setColor(result.isCorrect ? 0x2ecc71 : 0xe74c3c).setTitle(result.isCorrect ? "✅ Correct" : "❌ Raté").setDescription(lines.join("\n\n"));
  return interaction.reply(ephemeral({
    embeds: [embed],
    components: [{ type: 1, components: [{ type: 2, style: 5, label: "S'entraîner sur Medecine Hub", url: SITE }] }],
  }));
}

async function onResolveReport(interaction) {
  if (!isStaff(interaction.member)) return interaction.reply(ephemeral("Réservé à l'équipe."));
  const id = Number(interaction.customId.split(":")[2]);
  const changed = resolveReport(id);
  const embed = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(0x95a5a6)
    .setFooter({ text: `✅ Résolu par ${interaction.member.displayName}${changed ? "" : " (déjà résolu ou introuvable)"}` });
  return interaction.update({ embeds: [embed], components: [] });
}

export async function handleInteraction(interaction) {
  try {
    if (interaction.isChatInputCommand()) return await commandMap.get(interaction.commandName)?.execute(interaction);
    if (interaction.isAutocomplete()) return await commandMap.get(interaction.commandName)?.autocomplete?.(interaction);
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("qcm:")) return await onQcmAnswer(interaction);
    if (interaction.isButton() && interaction.customId.startsWith("report:resolve:")) return await onResolveReport(interaction);
  } catch (error) {
    await reportError(`interaction ${interaction.commandName ?? interaction.customId ?? ""}`.trim(), error);
    if (interaction.isRepliable()) {
      const payload = ephemeral("Une erreur est survenue de mon côté, réessaie dans un instant.");
      await (interaction.deferred || interaction.replied ? interaction.followUp(payload) : interaction.reply(payload)).catch(() => {});
    }
  }
}
