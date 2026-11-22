import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import { BRAND, CH, SITE } from "../config.js";
import { dailyLeaderboard, personalStats } from "../challenges.js";
import { weeklyLeaderboard, weeklySeconds } from "../study.js";
import { MEDALS, formatDuration } from "../util.js";

const rank = (i) => MEDALS[i] ?? `**${i + 1}.**`;

export const classement = {
  data: new SlashCommandBuilder()
    .setName("classement")
    .setDescription("Le classement de la communauté")
    .addStringOption((o) =>
      o.setName("type").setDescription("Lequel afficher ?").setRequired(true)
        .addChoices({ name: "Défis du jour (30 jours)", value: "defi" }, { name: "Temps d'étude en vocal (cette semaine)", value: "etude" })
    ),
  async execute(interaction) {
    const type = interaction.options.getString("type");
    const embed = new EmbedBuilder().setColor(BRAND);

    if (type === "defi") {
      const rows = dailyLeaderboard(30, 10);
      embed.setTitle("🎯 Classement des défis · 30 derniers jours").setDescription(
        rows.length
          ? rows.map((r, i) => `${rank(i)} <@${r.userId}> · **${r.correct}** bonne${r.correct > 1 ? "s" : ""} réponse${r.correct > 1 ? "s" : ""} sur ${r.played}${r.streak >= 2 ? ` · 🔥 ${r.streak}` : ""}`).join("\n")
          : `Personne n'a encore relevé de défi. Le prochain arrive à 18 h dans <#${CH.defis}> !`
      );
    } else {
      const rows = weeklyLeaderboard(10);
      embed.setTitle("📖 Temps d'étude · cette semaine").setDescription(
        rows.length
          ? rows.map((r, i) => `${rank(i)} <@${r.userId}> · **${formatDuration(r.seconds)}**`).join("\n")
          : "Personne n'a encore révisé en vocal cette semaine. Rejoins un salon **Étude** pour lancer le compteur."
      ).setFooter({ text: "Le temps passé dans les salons Étude et l'Amphi est compté" });
    }
    return interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
  },
};

export const moi = {
  data: new SlashCommandBuilder().setName("moi").setDescription("Tes statistiques sur le serveur"),
  async execute(interaction) {
    const s = personalStats(interaction.user.id);
    const percent = (a) => (a.played ? ` (${Math.round((100 * a.correct) / a.played)} %)` : "");
    const embed = new EmbedBuilder()
      .setColor(BRAND)
      .setAuthor({ name: interaction.member?.displayName ?? interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
      .addFields(
        { name: "🎯 Défis du jour", value: `${s.daily.correct}/${s.daily.played} réussis${percent(s.daily)}`, inline: true },
        { name: "🔥 Série", value: `${s.streak} jour${s.streak > 1 ? "s" : ""}`, inline: true },
        { name: "🩺 QCM libres", value: `${s.free.correct}/${s.free.played} réussis${percent(s.free)}`, inline: true },
        { name: "📖 Étude cette semaine", value: formatDuration(weeklySeconds(interaction.user.id)), inline: true },
      );
    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

export const aide = {
  data: new SlashCommandBuilder().setName("aide").setDescription("Ce que sait faire le bot"),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(BRAND)
      .setTitle("Le bot Medecine Hub")
      .setDescription(
        `\`/qcm\` · pose un QCM au hasard dans <#${CH.defis}>\n` +
        "`/classement` · défis du jour ou temps d'étude en vocal\n" +
        "`/moi` · tes statistiques\n" +
        "`/profil` · le profil public d'un·e étudiant·e du site\n" +
        "`/stats` · les chiffres de la plateforme\n\n" +
        `Chaque jour à **18 h**, un **défi** est posté dans <#${CH.defis}> (active le rôle 🎯 dans *Parcourir les salons* pour être prévenu·e). La correction arrive le lendemain à 8 h.\n\n` +
        `Le temps passé dans les salons **Étude** est compté automatiquement.\n[Ouvrir Medecine Hub](${SITE})`
      );
    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
