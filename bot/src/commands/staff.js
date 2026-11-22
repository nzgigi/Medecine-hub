import { EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { BRAND, CH, ROLE, SITE } from "../config.js";
import { isStaff } from "../perm.js";
import { truncate } from "../util.js";

const ephemeral = (content) => ({ content, flags: MessageFlags.Ephemeral });

/** Envoie dans un salon d'annonces puis le publie aux serveurs abonnés. */
async function publish(client, channelId, payload) {
  const channel = await client.channels.fetch(channelId);
  const message = await channel.send(payload);
  await message.crosspost().catch(() => {}); // sans effet hors salon d'annonces
  return message;
}

export const annonce = {
  data: new SlashCommandBuilder()
    .setName("annonce")
    .setDescription("(Équipe) Publie une annonce dans le salon des annonces")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((o) => o.setName("message").setDescription("Le texte de l'annonce").setRequired(true).setMaxLength(3500))
    .addStringOption((o) => o.setName("titre").setDescription("Titre (facultatif)").setMaxLength(200))
    .addBooleanOption((o) => o.setName("ping").setDescription("Notifier le rôle 🔔 Annonces")),
  async execute(interaction) {
    if (!isStaff(interaction.member)) return interaction.reply(ephemeral("Réservé à l'équipe."));
    const ping = interaction.options.getBoolean("ping") ?? false;
    const embed = new EmbedBuilder()
      .setColor(BRAND)
      .setTitle(interaction.options.getString("titre") ?? "Annonce")
      .setDescription(interaction.options.getString("message", true).replace(/\\n/g, "\n"));
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await publish(interaction.client, CH.annonces, {
      content: ping ? `<@&${ROLE.pingAnnonces}>` : undefined,
      embeds: [embed],
      allowedMentions: { roles: ping ? [ROLE.pingAnnonces] : [] },
    });
    return interaction.editReply(`Annonce publiée dans <#${CH.annonces}>.`);
  },
};

const MAJ_TYPES = {
  nouveaute: { label: "Nouveauté", emoji: "✨", color: 0x2ecc71 },
  amelioration: { label: "Amélioration", emoji: "🚀", color: 0x3498db },
  correction: { label: "Correction", emoji: "🐞", color: 0xf1c40f },
};

export const maj = {
  data: new SlashCommandBuilder()
    .setName("maj")
    .setDescription("(Équipe) Publie une mise à jour du site dans le journal des nouveautés")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((o) =>
      o.setName("type").setDescription("Type de mise à jour").setRequired(true)
        .addChoices(...Object.entries(MAJ_TYPES).map(([value, t]) => ({ name: t.label, value })))
    )
    .addStringOption((o) => o.setName("titre").setDescription("Titre court").setRequired(true).setMaxLength(200))
    .addStringOption((o) => o.setName("description").setDescription("Ce qui change, en une ou deux phrases").setRequired(true).setMaxLength(1500)),
  async execute(interaction) {
    if (!isStaff(interaction.member)) return interaction.reply(ephemeral("Réservé à l'équipe."));
    const type = MAJ_TYPES[interaction.options.getString("type", true)];
    const embed = new EmbedBuilder()
      .setColor(type.color)
      .setAuthor({ name: `${type.emoji} ${type.label}` })
      .setTitle(truncate(interaction.options.getString("titre", true), 250))
      .setDescription(interaction.options.getString("description", true))
      .setTimestamp();
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await publish(interaction.client, CH.maj, {
      embeds: [embed],
      components: [{ type: 1, components: [{ type: 2, style: 5, label: "Toutes les mises à jour", url: `${SITE}/mises-a-jour` }] }],
    });
    return interaction.editReply(`Mise à jour publiée dans <#${CH.maj}>.`);
  },
};
