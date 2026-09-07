# 🏆 Podium

Podium est le hub des jeux : **un compte**, reconnu dans tous les jeux, une
**cote Elo** par jeu, une **saison** mensuelle par points, et des **defis**
hebdomadaires et quotidiens. Les jeux restent autonomes — Podium les liste, les
lance, recoit leurs classements et publie leur calendrier de defis.

> Cousin d'[Arena](https://github.com/NQNT-VVV/arena) et de
> [Refrain](https://github.com/NQNT-VVV/refrain), dont Podium reprend
> l'architecture (Next + Express + SQLite) et le socle visuel.

---

## Ce que fait Podium

| Brique | Ce qu'elle apporte |
|---|---|
| **Catalogue** | Une fiche par jeu : accroche, URL, modes, statut. Ajouter un jeu se fait dans l'admin, sans code. |
| **Comptes** | **Connexion Discord** (OAuth2, portee `identify`) : un clic, un compte par personne, aucun mot de passe. Sans Discord configure (developpement), pseudo + mot de passe scrypt. |
| **Identite partagee (SSO)** | A la connexion, un cookie signe `nqnt_id` est pose sur `.danwalex.com`. Les jeux le lisent : pseudo pre-rempli, resultats rattaches au compte. |
| **Ranked** | Elo multijoueur par jeu, trois parties de placement, paliers Bronze → Argent → Or → Platine → Diamant → Legende. |
| **Saison** | Un mois. Chaque partie multijoueur rapporte de 10 (dernier) a 110 (premier) points. Classement global et par jeu. |
| **Defis auto** | Chaque semaine, un defi par jeu et un global, tires de gabarits (victoires, podiums, points, meilleur score…). Calcules des resultats recus. |
| **Defis « mode »** | Le jeu implemente un mode (musique du jour, pack de la semaine) ; Podium publie la periode et une **graine identique pour tous**, puis classe. |
| **Badges** | A la cloture d'un defi, les trois premiers recoivent un badge sur leur profil. |
| **Profils** | Cotes par jeu avec courbe, saison, badges, historique des parties. |
| **Admin** | Jeux et cles d'ingestion, defis speciaux, planificateur, journal des resultats recus. |

---

## Demarrage

**Node 22 est obligatoire** (better-sqlite3 est un module natif).

```bash
nvm use                # lit .nvmrc
npm install
npm run dev            # http://localhost:3000
```

Le **premier compte cree est administrateur**, ainsi que les identifiants
Discord listes dans `ADMIN_DISCORD_IDS`. Ouvre `/admin`, genere la cle
d'ingestion de chaque jeu, copie-la dans sa configuration (voir plus bas).

**Connexion.** En local, sans identifiants Discord, on se connecte par pseudo et
mot de passe. En production, des que `DISCORD_CLIENT_ID` et
`DISCORD_CLIENT_SECRET` sont renseignes, **Discord est la seule porte
d'entree** : les routes d'inscription et de connexion par mot de passe repondent
404. `PASSWORD_LOGIN=1` les rouvre si vraiment necessaire. Les sessions deja
ouvertes restent valides, et un compte cree par mot de passe peut rattacher son
Discord depuis `/moi` pour continuer a se connecter.

En production, `SSO_SECRET` est **obligatoire** : c'est le secret que les jeux
utilisent pour verifier le cookie d'identite. Un secret tire au demarrage les
rendrait aveugles a chaque redemarrage.

```bash
SSO_SECRET=$(openssl rand -hex 32) docker compose up --build
```

---

## Les pages

| Page | Contenu |
|---|---|
| `/` | Les jeux, les defis du jour et de la semaine, le top 5 de la saison, les dernieres parties |
| `/jeux/:slug` | Fiche du jeu : bouton Jouer, ranked, saison du jeu, defis, parties |
| `/classement` | Saison (globale ou par jeu, saisons passees) et ranked par jeu |
| `/defis` · `/defis/:slug` | Defis en cours, a venir, palmares ; classement complet d'un defi |
| `/joueurs/:pseudo` | Profil public : cotes, courbe, saison, badges, historique |
| `/connexion` · `/moi` | Compte, avatar, mot de passe, rattachement Discord |
| `/admin` | Reserve aux administrateurs |

---

## Brancher un jeu

Le contrat complet est dans [`docs/integration.md`](docs/integration.md), avec
un client de reference sans dependance dans [`docs/podium-client.js`](docs/podium-client.js).
En resume, cote jeu :

1. **Lire l'identite** : cookie `nqnt_id` = `base64url(payload).base64url(hmac)`,
   verifie avec `PODIUM_SSO_SECRET`. Le `pid` du payload identifie le compte.
2. **Envoyer le classement** en fin de partie :
   `POST {PODIUM_URL}/api/v1/games/{slug}/results` avec `Authorization: Bearer {PODIUM_GAME_KEY}`.
   Idempotent sur `matchId`. La reponse porte les variations d'Elo, a afficher si on veut.
3. **Consulter les defis** : `GET {PODIUM_URL}/api/v1/games/{slug}/challenges/active`,
   public. Les defis « mode » portent une `seed` a utiliser pour generer le contenu.

Arena et Refrain sont branches sur leur branche `podium-integration` ; Refrain
y ajoute le mode **Musique du jour** (`/daily`), premier defi quotidien.

Pour declarer un mode quotidien ou hebdo sur un jeu, dans l'admin, champ
« Modes » :

```json
[{ "id": "daily", "label": "Musique du jour", "emoji": "🎵", "period": "daily", "metric": "best_score" }]
```

Podium cree alors un defi par jour (ou par semaine) avec sa graine, et le jeu
peut le lire.

---

## Classement : les regles

**Elo multijoueur.** Chaque joueur est compare a tous les autres de la partie :
score reel = position normalisee (1 pour le premier, 0 pour le dernier, les
egalites partagent), score attendu = moyenne des probabilites de victoire face a
chacun. K = 40 les dix premieres parties, 24 ensuite, 16 au-dela de 1400. Les
joueurs sans compte comptent comme adversaires a 1000 mais ne sont pas classes.
Une partie a un seul joueur ne modifie rien. Depart a 1000 ; trois parties de
placement avant d'afficher un palier.

**Saison.** Points par partie multijoueur : `round(100 × (N − rang) / (N − 1)) + 10`.
La saison est le mois civil, fuseau `TIME_ZONE`.

**Defis.** Six criteres : `wins`, `podiums`, `matches`, `points`, `best_score`,
`score_sum`. Un defi peut filtrer sur un mode du jeu et un nombre minimal de
joueurs. Les gabarits hebdomadaires sont dans `server/challenges/templates.js`.

---

## Structure

```
server/
  index.js        Express + Next, demarrage
  config.js       seul lecteur de process.env
  db.js           SQLite, migrations lineaires
  repo.js         tout le SQL
  auth.js         scrypt, sessions, cookie SSO
  discord.js      OAuth2 Discord (optionnel)
  rating.js       Elo, points de saison, paliers (pur)
  periods.js      jours, semaines ISO, mois dans un fuseau (pur)
  ingest.js       reception et validation des classements
  challenges/     gabarits, creation, cloture, badges
  scheduler.js    taches periodiques
  api.js          toutes les routes
  metrics.js      Prometheus sur :9464
app/              pages Next (rendu serveur, appellent l'API locale)
components/       UI partagee
docs/             contrat d'integration et client de reference
deploy/           manifeste Kubernetes
```

## Tests

```bash
npm run test:rating     # Elo, points, paliers
npm run test:periods    # semaines ISO et changements d'heure
npm run test:auth       # Discord seul : mot de passe ferme, redirection OAuth
npm test                # parcours complet sur serveur reel (API seule)
```

## Deploiement

```bash
kubectl create namespace podium
kubectl -n podium create secret generic podium --from-literal=SSO_SECRET=$(openssl rand -hex 32)
kubectl apply -f deploy/podium.yaml
```

Puis, pour chaque jeu, le Secret `podium-integration` dans son namespace avec
`PODIUM_URL`, `PODIUM_GAME_KEY` (generee dans `/admin`) et `PODIUM_SSO_SECRET`
(la meme valeur que `SSO_SECRET`). Discord (obligatoire pour que quelqu'un
puisse se connecter en production) : voir `deploy/discord-secret.example.yaml`.

L'image est construite par GitHub Actions a chaque push sur `main`
(`ghcr.io/nqnt-vvv/podium`).
