import { defi, qcm } from "./practice.js";
import { aide, classement, moi } from "./community.js";
import { profil, stats } from "./site.js";
import { annonce, maj } from "./staff.js";

export const commands = [qcm, defi, classement, moi, stats, profil, aide, annonce, maj];
export const commandMap = new Map(commands.map((c) => [c.data.name, c]));
