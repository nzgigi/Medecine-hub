// Copie coherente de la base SQLite (VACUUM INTO).
// Contrairement a une copie de fichier, ca fonctionne pendant que le site tourne et
// integre le journal WAL (les ecritures recentes ne sont pas encore dans le .sqlite3).
//
// Usage : node scripts/snapshot-db.mjs <source.sqlite3> <destination.sqlite3>
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

const [source, destination] = process.argv.slice(2);

if (!source || !destination) {
  console.error("Usage : node snapshot-db.mjs <source.sqlite3> <destination.sqlite3>");
  process.exit(2);
}

if (!fs.existsSync(source)) {
  console.error(`Base introuvable : ${source}`);
  process.exit(1);
}

fs.rmSync(destination, { force: true });

const db = new DatabaseSync(source, { readOnly: true });
db.exec("PRAGMA busy_timeout = 10000;");
db.exec(`VACUUM INTO '${destination.replaceAll("\\", "/").replaceAll("'", "''")}'`);
db.close();

// On verifie la copie, pas la source : une sauvegarde illisible ne sert a rien.
const copy = new DatabaseSync(destination, { readOnly: true });
const integrity = copy.prepare("PRAGMA integrity_check").get().integrity_check;
const users = copy.prepare("SELECT COUNT(*) AS n FROM users").get().n;
copy.close();

if (integrity !== "ok") {
  console.error(`Copie corrompue : ${integrity}`);
  process.exit(1);
}

console.log(`Snapshot OK : ${users} utilisateur(s), ${fs.statSync(destination).size} octets`);
