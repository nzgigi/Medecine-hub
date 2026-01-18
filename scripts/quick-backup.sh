#!/bin/bash
cd /var/www/Medecine-hub

# Add tous les fichiers modifiés
git add .

# Commit avec timestamp
git commit -m "Auto-backup: Admin modification $(date '+%Y-%m-%d %H:%M:%S')" 2>/dev/null

# Push vers GitHub (silent mode)
git push origin main 2>/dev/null

exit 0
