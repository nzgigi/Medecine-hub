#!/bin/bash
set -e

# Ce script existe car medecine-hub a besoin de Node 22 (node:sqlite),
# alors que le Node systeme de ce VPS est en 20. Sans forcer nvm ici,
# `npm run build` echoue avec "No such built-in module: node:sqlite".

cd /var/www/Medecine-hub || exit 1

source ~/.nvm/nvm.sh
nvm use 22

git pull origin main
npm install
npm run build

PATH="$(nvm which 22 | xargs dirname):$PATH" PORT=4000 pm2 restart medecine-hub --update-env

echo "Deploiement termine."
pm2 logs medecine-hub --lines 15 --nostream
