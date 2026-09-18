#!/bin/bash
# Surveillance du VPS, lancee toutes les 5 minutes par cron. Envoie une alerte Discord si :
#   - le site ne repond plus (et un message quand il repond a nouveau) ;
#   - le processus pm2 plante en boucle ;
#   - le disque ou la memoire sont presque pleins (1 rappel max toutes les 6 h) ;
#   - la sauvegarde quotidienne n'a pas tourne depuis plus de 36 h.
#
# Limite : un VPS completement eteint ne peut pas s'alerter lui-meme. Doubler avec une sonde
# externe gratuite (ex. UptimeRobot sur https://medecinehub.fr).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(dirname "$SCRIPT_DIR")}"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/ops-common.sh"

PORT="${PORT:-4000}"
PM2_NAME="${PM2_NAME:-medecine-hub}"
DISK_LIMIT_PERCENT=85
MEM_MIN_AVAILABLE_PERCENT=10
CRASH_LOOP_RESTARTS=3
ALERT_COOLDOWN_SECONDS=$((6 * 3600))
BACKUP_MAX_AGE_SECONDS=$((36 * 3600))

NOW="$(date +%s)"

state_get() { cat "$STATE_DIR/$1" 2>/dev/null || true; }
state_set() { printf '%s' "$2" > "$STATE_DIR/$1"; }

# Alerte re-envoyee au plus une fois par ALERT_COOLDOWN_SECONDS tant que la condition dure.
alert_with_cooldown() {
  local key="$1" title="$2" details="$3" last
  last="$(state_get "cooldown_$key")"
  if [ $((NOW - ${last:-0})) -ge "$ALERT_COOLDOWN_SECONDS" ]; then
    send_alert "$title" "$details"
    state_set "cooldown_$key" "$NOW"
  fi
}
clear_cooldown() { rm -f "$STATE_DIR/cooldown_$1"; }

# --- Site -----------------------------------------------------------------
site_responds() {
  local attempt code
  for attempt in 1 2 3; do
    code="$(curl -s -o /dev/null -m 10 -w '%{http_code}' "http://127.0.0.1:$PORT/" || true)"
    [ "$code" = "200" ] && return 0
    sleep 10 # laisse passer un redemarrage pm2 (deploiement)
  done
  return 1
}

PM2_INFO="absent"
if command -v pm2 >/dev/null 2>&1 && command -v node >/dev/null 2>&1; then
  PM2_INFO="$(pm2 jlist 2>/dev/null | node -e '
    let raw = "";
    process.stdin.on("data", (chunk) => (raw += chunk)).on("end", () => {
      try {
        const list = JSON.parse(raw.slice(raw.indexOf("[")));
        const app = list.find((item) => item.name === process.argv[1]);
        console.log(app ? `${app.pm2_env.status} ${app.pm2_env.restart_time}` : "absent");
      } catch {
        console.log("erreur");
      }
    });
  ' "$PM2_NAME")"
fi
PM2_STATUS="${PM2_INFO%% *}"

previous_site="$(state_get site)"
if site_responds; then
  if [ "$previous_site" = "down" ]; then
    send_alert "✅ Medecine Hub répond de nouveau" "Le site est de nouveau accessible."
  fi
  state_set site up
else
  if [ "$previous_site" != "down" ]; then
    send_alert "🔴 Medecine Hub ne répond plus" "Statut pm2 : ${PM2_STATUS}. Pour voir pourquoi : pm2 logs ${PM2_NAME} --lines 50"
  fi
  state_set site down
fi

# --- Plantage en boucle ------------------------------------------------------
if [[ "$PM2_INFO" =~ ^[a-z]+\ ([0-9]+)$ ]]; then
  restarts="${BASH_REMATCH[1]}"
  previous_restarts="$(state_get pm2_restarts)"
  # Un deploiement ajoute 1 redemarrage : on n'alerte qu'a partir de plusieurs d'un coup.
  if [ -n "$previous_restarts" ] && [ $((restarts - previous_restarts)) -ge "$CRASH_LOOP_RESTARTS" ]; then
    send_alert "🔴 Plantage en boucle probable" "${PM2_NAME} a redémarré $((restarts - previous_restarts)) fois en quelques minutes. Pour voir pourquoi : pm2 logs ${PM2_NAME} --err --lines 50"
  fi
  state_set pm2_restarts "$restarts"
fi

# --- Disque -------------------------------------------------------------
disk_used="$(df --output=pcent / 2>/dev/null | tail -n1 | tr -dc '0-9')"
if [ -n "$disk_used" ]; then
  if [ "$disk_used" -ge "$DISK_LIMIT_PERCENT" ]; then
    alert_with_cooldown disk "🟠 Disque presque plein" "Occupé à ${disk_used} % (seuil ${DISK_LIMIT_PERCENT} %)."
  else
    clear_cooldown disk
  fi
fi

# --- Memoire ------------------------------------------------------------
if command -v free >/dev/null 2>&1; then
  mem_available="$(free | awk '/^Mem:/ { printf "%d", $7 * 100 / $2 }')"
  if [ -n "$mem_available" ]; then
    if [ "$mem_available" -lt "$MEM_MIN_AVAILABLE_PERCENT" ]; then
      alert_with_cooldown memory "🟠 Mémoire presque saturée" "${mem_available} % disponible (seuil ${MEM_MIN_AVAILABLE_PERCENT} %)."
    else
      clear_cooldown memory
    fi
  fi
fi

# --- Fraicheur de la sauvegarde ------------------------------------------
last_backup_epoch="$(grep -o '"epoch":[0-9]*' "$STATE_DIR/last_backup" 2>/dev/null | cut -d: -f2)"
if [ -z "$last_backup_epoch" ]; then
  alert_with_cooldown backup "🟠 Aucune sauvegarde enregistrée" "scripts/setup-ops.sh a-t-il été lancé ?"
elif [ $((NOW - last_backup_epoch)) -gt "$BACKUP_MAX_AGE_SECONDS" ]; then
  alert_with_cooldown backup "🟠 Sauvegarde en retard" "Dernière sauvegarde il y a plus de $(((NOW - last_backup_epoch) / 3600)) h. Voir /var/log/medecine-hub-ops.log"
else
  clear_cooldown backup
fi
