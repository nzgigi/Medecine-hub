#!/bin/bash
# Fonctions communes aux scripts d'exploitation (sauvegarde, surveillance).
# A inclure avec `source`, apres avoir (eventuellement) defini APP_DIR.

APP_DIR="${APP_DIR:-/var/www/Medecine-hub}"
STATE_DIR="${OPS_STATE_DIR:-/var/lib/medecine-hub-monitor}"
mkdir -p "$STATE_DIR"

# Node 22 (node:sqlite) via nvm, comme scripts/deploy.sh : le Node systeme du VPS est en 20.
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  source "$HOME/.nvm/nvm.sh"
  nvm use 22 >/dev/null 2>&1 || true
fi

# Lit une variable dans le .env de l'application (sans le sourcer : il n'est pas garanti valide en bash).
read_env_var() {
  grep -E "^$1=" "$APP_DIR/.env" 2>/dev/null | head -n1 | cut -d= -f2- | tr -d '"\r'
}

# Echappe une chaine pour l'inclure dans du JSON.
json_escape() {
  local backslash='\' value
  value="${1//"$backslash"/"$backslash$backslash"}"
  value="${value//\"/"$backslash\""}"
  value="${value//$'\n'/"${backslash}n"}"
  value="${value//$'\t'/"${backslash}t"}"
  printf '%s' "$value"
}

# Journalise l'alerte et l'envoie sur Discord (en embed) si DISCORD_ALERT_WEBHOOK_URL est
# configure (variable d'environnement ou .env de l'application).
#   send_alert "<emoji> Titre" ["details"]
# L'emoji de tete fixe la couleur : 🔴 panne (ping @everyone), 🟠 avertissement, ✅ information.
send_alert() {
  local title="$1" details="${2:-}"
  echo "[$(date '+%F %T')] ALERTE: $title${details:+ - $details}"

  local url="${DISCORD_ALERT_WEBHOOK_URL:-$(read_env_var DISCORD_ALERT_WEBHOOK_URL)}"
  [ -z "$url" ] && return 0

  local color=9807270 content="" allowed='{"parse":[]}'
  case "$title" in
    🔴*) color=15158332; content="@everyone"; allowed='{"parse":["everyone"]}' ;;
    🟠*) color=15105570 ;;
    ✅*) color=3066993 ;;
  esac

  # Corps envoye via stdin (octets UTF-8 bruts) : passer des accents/emojis en argument
  # de curl depend de la page de code du systeme.
  printf '{"content":"%s","allowed_mentions":%s,"username":"Medecine Hub — Surveillance","embeds":[{"title":"%s","description":"%s","color":%s,"footer":{"text":"%s"},"timestamp":"%s"}]}' \
    "$content" "$allowed" \
    "$(json_escape "${title:0:250}")" "$(json_escape "${details:0:3500}")" \
    "$color" "$(json_escape "$(hostname)")" "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" \
    | curl -fsS -m 10 -H 'Content-Type: application/json; charset=utf-8' \
        --data-binary @- "$url" >/dev/null \
    || echo "[$(date '+%F %T')] Envoi Discord echoue"
}
