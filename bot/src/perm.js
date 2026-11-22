import { PermissionFlagsBits } from "discord.js";
import { ROLE } from "./config.js";

/** Membre de l'équipe : rôle Admin ou Modération, ou permission Administrateur. */
export function isStaff(member) {
  if (!member) return false;
  if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
  const roles = member.roles?.cache ?? member.roles;
  return !!roles?.has && (roles.has(ROLE.admin) || roles.has(ROLE.mod));
}
