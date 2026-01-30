#!/bin/bash

cd /var/www/Medecine-hub || exit 1

git add .

if ! git diff --cached --quiet; then
  git commit -m "Auto-backup: Admin modification $(date '+%Y-%m-%d %H:%M:%S')" 2>/dev/null
  git push origin main 2>/dev/null
fi

exit 0
