import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { CH } from "../config.js";
import { postChallenge, todaysDaily } from "../challenges.js";
import { listMatieres } from "../qcm.js";
import { isStaff } from "../perm.js";
import { normalize } from "../util.js";

const cooldown = new Map(); // userId -> timestamp du dernier /qcm
const COOLDOWN_MS = 45_000;

async function matiereAutocomplete(interaction) {
  const typed = normalize(interaction.options.getFocused());
  const choices = listMatieres().filter((m) => normalize(m).includes(typed)).slice(0, 25);
  await interaction.respond(choices.map((m) => ({ name: m.slice(0, 100), value: m.slice(0, 100) })));
}

const ephemeral = (content) => ({ content, flags: MessageFlags.Ephemeral });

export const qcm = {
  data: new SlashCommandBuilder()
    .setName("qcm")
    .setDescription("Pose un QCM au hasard dans le salon, pour toi et les autres")
    .addStringOption((o) => o.setName("matiere").setDescription("Limiter à une matière").setAutocomplete(true)),
  autocomplete: matiereAutocomplete,
  async execute(interaction) {
    if (interaction.channelId !== CH.defis) {
      return interaction.reply(ephemeral(`Les QCM se lancent dans <#${CH.defis}>.`));
    }
    const last = cooldown.get(interaction.user.id) ?? 0;
    if (Date.now() - last < COOLDOWN_MS) {
      return interaction.reply(ephemeral("Doucement : laisse les autres répondre avant d'en lancer un nouveau."));
    }
    const matiere = interaction.options.getString("matiere") ?? undefined;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const challenge = await postChallenge(interaction.client, { kind: "free", matiere });
    if (!challenge) return interaction.editReply("Je n'ai trouvé aucune question pour cette matière.");
    cooldown.set(interaction.user.id, Date.now());
    return interaction.editReply("C'est posté ! Réponds avec le menu sous la question.");
  },
};

export const defi = {
  data: new SlashCommandBuilder()
    .setName("defi")
    .setDescription("(Équipe) Lance le défi du jour maintenant")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((o) => o.setName("matiere").setDescription("Limiter à une matière").setAutocomplete(true))
    .addBooleanOption((o) => o.setName("forcer").setDescription("Poster même si le défi d'aujourd'hui existe déjà")),
  autocomplete: matiereAutocomplete,
  async execute(interaction) {
    if (!isStaff(interaction.member)) return interaction.reply(ephemeral("Réservé à l'équipe."));
    if (todaysDaily() && !interaction.options.getBoolean("forcer")) {
      return interaction.reply(ephemeral("Le défi d'aujourd'hui est déjà posté. Ajoute `forcer: True` pour en poster un autre."));
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const challenge = await postChallenge(interaction.client, { kind: "daily", matiere: interaction.options.getString("matiere") ?? undefined });
    return interaction.editReply(challenge ? `Défi posté dans <#${CH.defis}>.` : "Aucune question trouvée.");
  },
};
