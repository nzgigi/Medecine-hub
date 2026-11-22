import { EmbedBuilder } from "discord.js";
import { CH } from "./config.js";
import { truncate } from "./util.js";

let client = null;
const lastAlert = new Map(); // contexte -> timestamp
const ALERT_EVERY_MS = 10 * 60_000;

export function setErrorClient(c) {
  client = c;
}

/** Journalise l'erreur et, au plus toutes les 10 min par contexte, prévient l'équipe dans #alertes-serveur. */
export async function reportError(where, error) {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.error(`[${new Date().toISOString()}] ${where}:`, error);

  const now = Date.now();
  if (!client?.isReady() || now - (lastAlert.get(where) ?? 0) < ALERT_EVERY_MS) return;
  lastAlert.set(where, now);

  try {
    const channel = await client.channels.fetch(CH.alertes);
    const embed = new EmbedBuilder()
      .setColor(0xe67e22)
      .setTitle(`🟠 Bot Discord · erreur (${where})`)
      .setDescription(`\`\`\`${truncate(message, 900)}\`\`\``)
      .setTimestamp();
    await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
  } catch {
    // impossible d'alerter : le journal console suffit
  }
}
