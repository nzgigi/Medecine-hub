#!/bin/bash
# Sauvegarde quotidienne : snapshot coherent de la base SQLite + donnees non versionnees
# (journal admin, compteurs de vues, photos de profil), poussee vers un depot GitHub PRIVE.
#
# IMPORTANT : BACKUP_REPO_DIR ne doit jamais pointer vers le depot public du site,
# la base contient les adresses mail des membres. scripts/setup-ops.sh le verifie.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(dirname "$SCRIPT_DIR")}"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/ops-common.sh"

set -Eeo pipefail

BACKUP_REPO_DIR="${BACKUP_REPO_DIR:-/var/backups/medecine-hub-backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
MAX_ARCHIVE_BYTES=$((90 * 1024 * 1024)) # GitHub refuse les fichiers > 100 Mo

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT
trap 'send_alert "🔴 Sauvegarde de la base échouée" "Erreur à la ligne $LINENO de backup-db.sh. Détails : /var/log/medecine-hub-ops.log"' ERR

if [ ! -d "$BACKUP_REPO_DIR/.git" ]; then
  echo "Depot de sauvegarde absent : $BACKUP_REPO_DIR (lancer scripts/setup-ops.sh)"
  false
fi

STAMP="$(date '+%Y-%m-%d')"
PAYLOAD="$WORK_DIR/payload"
mkdir -p "$PAYLOAD"

node "$SCRIPT_DIR/snapshot-db.mjs" "$APP_DIR/data/db/medecine-hub.sqlite3" "$PAYLOAD/medecine-hub.sqlite3"

if [ -d "$APP_DIR/data/analytics" ]; then cp -r "$APP_DIR/data/analytics" "$PAYLOAD/analytics"; fi
if [ -d "$APP_DIR/data/admin" ]; then cp -r "$APP_DIR/data/admin" "$PAYLOAD/admin"; fi
if [ -d "$APP_DIR/public/images/users" ]; then
  mkdir -p "$PAYLOAD/images"
  cp -r "$APP_DIR/public/images/users" "$PAYLOAD/images/users"
fi

ARCHIVE="$WORK_DIR/medecine-hub-$STAMP.tar.gz"
tar -czf "$ARCHIVE" -C "$PAYLOAD" .
SIZE="$(wc -c < "$ARCHIVE" | tr -d ' ')"

if [ "$SIZE" -gt "$MAX_ARCHIVE_BYTES" ]; then
  send_alert "🔴 Sauvegarde trop volumineuse" "Archive de $((SIZE / 1024 / 1024)) Mo : GitHub refuse au-delà de 100 Mo. Il faut changer de destination."
  exit 1
fi

cd "$BACKUP_REPO_DIR"
cp "$ARCHIVE" .

# Retention : on retire les archives plus vieilles que RETENTION_DAYS (date lue dans le nom du fichier).
CUTOFF="$(date -d "-${RETENTION_DAYS} days" '+%Y-%m-%d')"
for file in medecine-hub-*.tar.gz; do
  [ -e "$file" ] || continue
  file_day="${file#medecine-hub-}"
  file_day="${file_day%.tar.gz}"
  if [[ "$file_day" < "$CUTOFF" ]]; then rm -f "$file"; fi
done

git add -A
if git diff --cached --quiet; then
  echo "Aucun changement a enregistrer."
else
  git commit -q -m "Sauvegarde $STAMP"
fi
git push -q origin HEAD

# Reference pour la surveillance (healthcheck.sh) et l'onglet Monitoring de l'admin.
printf '{"at":"%s","epoch":%s,"bytes":%s}' \
  "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$(date +%s)" "$SIZE" > "$STATE_DIR/last_backup"

echo "[$(date '+%F %T')] Sauvegarde OK ($((SIZE / 1024)) Ko) -> $BACKUP_REPO_DIR"
