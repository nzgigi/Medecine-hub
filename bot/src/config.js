import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const BOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Charge bot/.env (sans dépendance) sans écraser les variables déjà définies.
const envFile = path.join(BOT_DIR, ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

export const TOKEN = process.env.DISCORD_BOT_TOKEN;
export const BOT_DATA_DIR = process.env.BOT_DATA_DIR ?? path.join(BOT_DIR, "data");
export const SITE_DIR = path.resolve(process.env.SITE_DIR ?? path.join(BOT_DIR, ".."));
export const SITE_INTERNAL_URL = process.env.SITE_INTERNAL_URL ?? "http://127.0.0.1:4000";
export const SITE = "https://medecinehub.fr";
export const TZ = "Europe/Paris";
export const BRAND = 0x4e8f6c;

export const GUILD_ID = "1550628170267365527";

export const CH = {
  general: "1550628182061744191",
  annonces: "1550949829943754835",
  maj: "1550949832120606770",
  defis: "1550949758133080074",
  staff: "1550949789850669126",
  alertes: "1550630265825792070",
  site: "1550967379322740856",
  logs: "1550967383399862393",
  entraide: "1550949834653966458",
  support: "1550949839037145139",
  corrections: "1550949841134428303",
  suggestions: "1550949843394887730",
  etude: ["1550949771349467206", "1550949773492883576", "1550949836981796895"], // Étude 1, Étude 2, Amphi
};

export const ROLE = {
  admin: "1550949643334983753",
  mod: "1550949645713412108",
  pingAnnonces: "1550949664935772278",
  pingDefi: "1550949669612425329",
};

export const DAILY_HOUR = 18; // Défi du jour
export const RECAP_HOUR = 8; // Correction publique du défi de la veille
export const DIGEST_HOUR = 8; // Résumé quotidien pour l'équipe (à partir de 08:30)
export const DIGEST_MINUTE = 30;
