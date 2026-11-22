#!/bin/bash
set -e

# Deploie le bot Discord (dossier bot/) sur le VPS, a cote du site.
# Meme raison que scripts/deploy.sh : le bot utilise node:sqlite, donc Node 22 via nvm.
# Prerequis (une seule fois) : creer /var/www/Medecine-hub/bot/.env avec DISCORD_BOT_TOKEN=...
# (chmod 600), voir bot/.env.example.

APP_DIR=/var/www/Medecine-hub
cd "$APP_DIR" || exit 1

source ~/.nvm/nvm.sh
nvm use 22

git pull origin main

cd "$APP_DIR/bot" || exit 1

if [ ! -f .env ] && [ -z "$DISCORD_BOT_TOKEN" ]; then
  echo "ERREUR : $APP_DIR/bot/.env est absent (DISCORD_BOT_TOKEN=...). Voir bot/.env.example."
  exit 1
fi
[ -f .env ] && chmod 600 .env

npm install --omit=dev --no-audit --no-fund

NODE_BIN="$(nvm which 22)"
if pm2 describe medecine-hub-bot >/dev/null 2>&1; then
  PATH="$(dirname "$NODE_BIN"):$PATH" pm2 restart medecine-hub-bot --update-env
else
  pm2 start src/index.js --name medecine-hub-bot --interpreter "$NODE_BIN" --node-args="--disable-warning=ExperimentalWarning"
fi
pm2 save

echo "Bot deploye."
pm2 logs medecine-hub-bot --lines 15 --nostream
