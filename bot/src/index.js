import { Client, Events, GatewayIntentBits } from "discord.js";
import { GUILD_ID, TOKEN } from "./config.js";
import { commands } from "./commands/index.js";
import { setErrorClient, reportError } from "./errors.js";
import { registerEvents } from "./events.js";
import { startJobs } from "./jobs.js";
import { isStudyChannel, startSession, stopAllSessions } from "./study.js";

if (!TOKEN) {
  console.error("DISCORD_BOT_TOKEN manquant (bot/.env ou variable d'environnement).");
  process.exit(1);
}

const INTENTS = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildVoiceStates];

function createClient(intents) {
  const client = new Client({ intents });
  setErrorClient(client);
  registerEvents(client);

  client.once(Events.ClientReady, async (ready) => {
    console.log(`[bot] connecté en tant que ${ready.user.tag}`);
    await ready.application.commands.set(commands.map((c) => c.data.toJSON()), GUILD_ID);
    console.log(`[bot] ${commands.length} commandes enregistrées`);

    // Reprend le décompte des personnes déjà en vocal d'étude au démarrage.
    const guild = ready.guilds.cache.get(GUILD_ID);
    for (const state of guild?.voiceStates.cache.values() ?? []) {
      if (isStudyChannel(state.channelId) && !state.member?.user.bot) startSession(state.id);
    }
    startJobs(ready);
  });
  return client;
}

let client = createClient(INTENTS);
try {
  await client.login(TOKEN);
} catch (error) {
  // « Server Members Intent » désactivé dans le portail développeur : on démarre sans (pas de journal d'arrivées/départs).
  if (String(error?.message).includes("disallowed intents")) {
    console.warn("[bot] intent GuildMembers refusé : démarrage sans journal d'arrivées. Active « Server Members Intent » dans le portail.");
    client.destroy();
    client = createClient(INTENTS.filter((i) => i !== GatewayIntentBits.GuildMembers));
    await client.login(TOKEN);
  } else {
    throw error;
  }
}

process.on("unhandledRejection", (error) => reportError("unhandledRejection", error));
process.on("uncaughtException", (error) => reportError("uncaughtException", error));

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    console.log(`[bot] ${signal} : arrêt`);
    stopAllSessions(); // enregistre le temps d'étude en cours
    client.destroy();
    process.exit(0);
  });
}
