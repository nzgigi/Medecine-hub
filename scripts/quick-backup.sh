#!/bin/bash

# Script de backup automatique pour Medecine Hub
# Exécuté après chaque modification admin

# Aller dans le dossier du projet
cd /var/www/Medecine-hub

# Ajouter tous les fichiers modifiés
git add .

# Commit avec timestamp détaillé
git commit -m "Auto-backup: Admin modification $(date '+%Y-%m-%d %H:%M:%S')" 2>/dev/null

# Push vers GitHub en mode silencieux
git push origin main 2>/dev/null

# Code de sortie propre
exit 0
