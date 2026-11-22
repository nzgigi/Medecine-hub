# Bot Discord Medecine Hub

Processus Node indépendant du site (discord.js), lancé par pm2 à côté de lui. Il lit la base SQLite et les QCM du site
(lecture seule, sauf « Marquer résolu » sur un signalement) et garde son propre état dans `bot/data/bot.sqlite3`.

## Ce qu'il fait

**Commandes**
- `/qcm [matiere]` : pose un QCM au hasard dans `#défis-qcm` (menu déroulant, correction privée immédiate, une tentative par personne)
- `/classement` : défis du jour (30 jours) ou temps d'étude en vocal (semaine)
- `/moi` · `/profil` · `/stats` · `/aide`
- Équipe : `/defi` (lancer le défi maintenant), `/annonce`, `/maj` (publient et diffusent dans les salons d'annonces)

**Automatismes**
- 18 h : défi du jour dans `#défis-qcm` (ping du rôle 🎯) ; 8 h le lendemain : correction publique, séries en cours
- 8 h 30 : résumé de l'équipe dans `#site` (inscriptions, séances, pic de visiteurs, signalements en attente)
- Signalements de QCM du site → `#site` avec un bouton « Marquer résolu »
- Journal d'administration du site et arrivées/départs → `#logs`, alerte anti-raid (6 arrivées en 1 min) dans `#staff`
- Forums : accueil automatique des posts, votes 👍/👎 sur les suggestions, tickets support prévenant l'équipe (ping sur les bugs),
  message de statut et archivage quand un tag Résolu / Confirmée / Rejetée / Planifiée / Livrée / Refusée est posé
- Temps d'étude compté automatiquement dans les salons Étude et l'Amphi
- Jalons (inscrits sur le site, membres Discord) annoncés automatiquement
- Erreurs du bot signalées dans `#alertes-serveur` (au plus une fois toutes les 10 minutes par type)

Les identifiants des salons et rôles sont dans `src/config.js`.

## Installation

```bash
cd bot
cp .env.example .env   # renseigner DISCORD_BOT_TOKEN
npm install
npm start
npm test
```

Prérequis : Node ≥ 22.5 (`node:sqlite`), intents « Server Members » activé dans le portail développeur.

## Déploiement sur le VPS

Créer une fois `/var/www/Medecine-hub/bot/.env` avec le token, puis après chaque `git push` :

```bash
ssh -i ~/.ssh/medecinehub_vps_ed25519 root@185.163.124.184 'bash /var/www/Medecine-hub/scripts/deploy-bot.sh'
```

Logs : `pm2 logs medecine-hub-bot`.

## Côté site

Le formulaire de contact prévient aussi l'équipe sur Discord si `DISCORD_SITE_WEBHOOK_URL` est défini dans le `.env` du site
(webhook du salon `#site`, voir `src/lib/server/discordNotify.ts`).
