#!/bin/bash
# Installation unique sur le VPS : depot de sauvegarde + taches cron (sauvegarde et surveillance).
# Idempotent : on peut le relancer sans dupliquer les taches cron.
#
# Usage : bash scripts/setup-ops.sh git@github.com:<compte>/<depot-prive>.git
#
# Prerequis :
#   1. un depot GitHub PRIVE et vide (la base contient des adresses mail) ;
#   2. DISCORD_ALERT_WEBHOOK_URL=... ajoute dans /var/www/Medecine-hub/.env (facultatif mais recommande).

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(dirname "$SCRIPT_DIR")}"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/ops-common.sh"

BACKUP_REMOTE="${1:-}"
BACKUP_REPO_DIR="${BACKUP_REPO_DIR:-/var/backups/medecine-hub-backups}"
LOG_FILE="/var/log/medecine-hub-ops.log"
CRON_TAG="# medecine-hub-ops"

if [ -z "$BACKUP_REMOTE" ]; then
  echo "Usage : bash scripts/setup-ops.sh git@github.com:<compte>/<depot-prive>.git"
  exit 1
fi

# --- Garde-fou : refuse un depot public ------------------------------------
if [[ "$BACKUP_REMOTE" =~ github\.com[:/]([^/]+)/([^/]+)$ ]]; then
  owner="${BASH_REMATCH[1]}"
  repo="${BASH_REMATCH[2]%.git}"
  status="$(curl -s -o /dev/null -m 10 -w '%{http_code}' "https://api.github.com/repos/$owner/$repo" || true)"

  if [ "$status" = "200" ]; then
    echo "REFUS : $owner/$repo est PUBLIC. La sauvegarde contient les adresses mail des membres."
    echo "Passez le depot en prive (Settings > Danger Zone > Change visibility) puis relancez."
    exit 1
  fi
fi

# --- Depot de sauvegarde -------------------------------------------------
if [ ! -d "$BACKUP_REPO_DIR/.git" ]; then
  mkdir -p "$(dirname "$BACKUP_REPO_DIR")"
  git clone "$BACKUP_REMOTE" "$BACKUP_REPO_DIR"
fi
git -C "$BACKUP_REPO_DIR" config user.name "Medecine Hub Backup"
git -C "$BACKUP_REPO_DIR" config user.email "backup@medecinehub.fr"

# --- Cron (conserve les taches existantes) --------------------------------
touch "$LOG_FILE"
{
  crontab -l 2>/dev/null | grep -v "$CRON_TAG" || true
  echo "*/5 * * * * /bin/bash $SCRIPT_DIR/healthcheck.sh >> $LOG_FILE 2>&1 $CRON_TAG"
  echo "30 4 * * * /bin/bash $SCRIPT_DIR/backup-db.sh >> $LOG_FILE 2>&1 $CRON_TAG"
} | crontab -
echo "Taches cron installees :"
crontab -l | grep "$CRON_TAG"

# --- Premiere sauvegarde + test d'alerte ----------------------------------
echo
echo "Premiere sauvegarde..."
bash "$SCRIPT_DIR/backup-db.sh"

send_alert "✅ Surveillance activée" "Contrôle du site toutes les 5 minutes, sauvegarde de la base chaque jour à 4 h 30."

echo
if [ -z "${DISCORD_ALERT_WEBHOOK_URL:-$(read_env_var DISCORD_ALERT_WEBHOOK_URL)}" ]; then
  echo "ATTENTION : DISCORD_ALERT_WEBHOOK_URL absent de $APP_DIR/.env -> aucune alerte Discord ne sera envoyee."
else
  echo "Un message de test vient d'etre envoye sur Discord."
fi
echo "Termine."
