import fs from "fs";
import { safeJoinInside, type AdminIdentity } from "./security";

export interface AdminLogEntry {
  id: string;
  at: string;
  actor: {
    username: string;
  } & AdminIdentity;
  action: string;
  details?: string;
}

const MAX_LOG_ENTRIES = 500;

function getStorePath() {
  const dir = safeJoinInside(process.cwd(), "data", "admin");

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return safeJoinInside(dir, "logs.json");
}

export function readAdminLogs(): AdminLogEntry[] {
  const storePath = getStorePath();

  if (!fs.existsSync(storePath)) return [];

  try {
    return JSON.parse(fs.readFileSync(storePath, "utf-8")) as AdminLogEntry[];
  } catch {
    return [];
  }
}

export function logAdminAction(
  actor: { username: string } & AdminIdentity,
  action: string,
  details?: string
) {
  try {
    const logs = readAdminLogs();

    const entry: AdminLogEntry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      at: new Date().toISOString(),
      actor,
      action,
      details,
    };

    logs.unshift(entry);

    const trimmed = logs.slice(0, MAX_LOG_ENTRIES);

    fs.writeFileSync(
      getStorePath(),
      JSON.stringify(trimmed, null, 2),
      "utf-8"
    );
  } catch (error) {
    // Le journal ne doit jamais faire échouer l'action admin elle-même.
    console.error("Erreur écriture journal admin:", error);
  }
}
