import fs from "fs";
import { safeJoinInside } from "@/lib/server/security";
import { privateQcmDir } from "@/lib/server/privateQcm";
import {
  applyPrivateOutcomes,
  mergePrivateHistories,
  parsePrivateHistory,
  type PrivateHistory,
  type PrivateOutcome,
} from "@/lib/exam/privateTraining";

// Dans data/private-qcm/ (hors de public/, ignoré par git) : jamais servi statiquement,
// uniquement via les routes admin. Le nom ne correspond pas au motif des QCM (slug_annee.json).
function historyPath() {
  return safeJoinInside(privateQcmDir(), "history.json");
}

export function readPrivateHistory(): PrivateHistory {
  try {
    return parsePrivateHistory(fs.readFileSync(historyPath(), "utf-8"));
  } catch {
    return {};
  }
}

function writePrivateHistory(history: PrivateHistory) {
  const target = historyPath();
  const temp = `${target}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(history), "utf-8");
  fs.renameSync(temp, target);
}

// Les routes sont synchrones de bout en bout : lecture-modification-écriture sans entrelacement.
export function recordPrivateOutcomes(outcomes: PrivateOutcome[]): PrivateHistory {
  const next = applyPrivateOutcomes(readPrivateHistory(), outcomes, new Date().toISOString());
  writePrivateHistory(next);
  return next;
}

export function importLegacyHistory(incoming: PrivateHistory): PrivateHistory {
  const next = mergePrivateHistories(readPrivateHistory(), incoming);
  writePrivateHistory(next);
  return next;
}

export function clearPrivateHistory() {
  writePrivateHistory({});
}
