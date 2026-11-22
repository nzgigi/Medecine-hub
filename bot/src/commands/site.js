import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import { BRAND, GUILD_ID, SITE } from "../config.js";
import { findProfile, onlineNow, siteCounts } from "../sitedata.js";
import { loadCatalog } from "../qcm.js";

const fmt = (n) => new Intl.NumberFormat("fr-FR").format(n);

export const stats = {
  data: new SlashCommandBuilder().setName("stats").setDescription("Les chiffres de Medecine Hub"),
  async execute(interaction) {
    await interaction.deferReply();
    const counts = siteCounts();
    const online = await onlineNow();
    const catalog = loadCatalog();
    const questions = catalog.reduce((sum, e) => sum + e.ids.length, 0);
    const guild = interaction.client.guilds.cache.get(GUILD_ID);

    const embed = new EmbedBuilder().setColor(BRAND).setTitle("Medecine Hub en chiffres").setURL(SITE);
    if (counts) {
      embed.addFields(
        { name: "Étudiant·es inscrit·es", value: fmt(counts.users), inline: true },
        { name: "Séances terminées", value: fmt(counts.attempts), inline: true },
        { name: "Aujourd'hui", value: `${fmt(counts.attempts24h)} séances · ${fmt(counts.activeUsers24h)} actif·ves`, inline: true },
      );
    }
    embed.addFields(
      { name: "Épreuves en ligne", value: fmt(catalog.length), inline: true },
      { name: "Questions à choix", value: fmt(questions), inline: true },
      { name: "En ligne maintenant", value: online == null ? "—" : fmt(online), inline: true },
    );
    if (guild) embed.setFooter({ text: `${fmt(guild.memberCount)} membres sur ce serveur` });
    return interaction.editReply({ embeds: [embed] });
  },
};

export const profil = {
  data: new SlashCommandBuilder()
    .setName("profil")
    .setDescription("Le profil public d'un·e étudiant·e sur Medecine Hub")
    .addStringOption((o) => o.setName("nom").setDescription("Identifiant (handle) ou nom exact").setRequired(true)),
  async execute(interaction) {
    const profile = findProfile(interaction.options.getString("nom", true));
    if (!profile) {
      return interaction.reply({ content: "Je ne trouve personne avec cet identifiant. Le handle est visible dans l'adresse du profil : medecinehub.fr/profil/…", flags: MessageFlags.Ephemeral });
    }
    const url = `${SITE}/profil/${encodeURIComponent(profile.handle)}`;
    const embed = new EmbedBuilder()
      .setColor(BRAND)
      .setTitle(profile.name)
      .setURL(url)
      .setDescription(`@${profile.handle} · membre depuis le ${new Date(profile.memberSince).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}`)
      .addFields(
        { name: "Séances", value: fmt(profile.attempts), inline: true },
        { name: "Matières", value: fmt(profile.matieres), inline: true },
        { name: "Succès", value: fmt(profile.achievements), inline: true },
        { name: "Score moyen", value: profile.attempts ? `${profile.avg} %` : "—", inline: true },
        { name: "Meilleur score", value: profile.attempts ? `${profile.best} %` : "—", inline: true },
        { name: "Abonné·es", value: fmt(profile.followers), inline: true },
      );
    return interaction.reply({ embeds: [embed] });
  },
};
