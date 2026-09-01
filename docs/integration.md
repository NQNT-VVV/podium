# Integrer un jeu a Podium

Podium est le hub : comptes, classement (ranked), defis hebdo et quotidiens.
Un jeu reste autonome — il tourne sans Podium — et gagne trois choses en s'y
branchant :

1. **Identite** : le joueur connecte sur Podium est reconnu par le jeu (pseudo
   pre-rempli, resultats rattaches a son compte).
2. **Resultats** : a la fin d'une partie, le jeu envoie le classement a Podium,
   qui met a jour l'Elo, les points de saison et les defis.
3. **Defis « mode »** : Podium publie un calendrier (ex. « musique du jour »,
   graine du jour) que le jeu consulte pour proposer le mode correspondant.

Tout est **optionnel et inerte sans configuration** : sans `PODIUM_URL`, le
module ne s'attache a rien.

---

## Variables d'environnement (cote jeu)

| Variable | Role |
|---|---|
| `PODIUM_URL` | Origine publique du hub, ex. `https://podium.danwalex.com`. Vide = module desactive. |
| `PODIUM_GAME_KEY` | Cle d'ingestion du jeu, generee dans l'admin Podium (`/admin/jeux`). Sert a poster les resultats. |
| `PODIUM_SSO_SECRET` | Secret partage avec Podium (`SSO_SECRET` cote hub). Sert a verifier le cookie d'identite. |
| `PODIUM_SSO_COOKIE` | Nom du cookie d'identite. Defaut `nqnt_id`. |

En k8s : les trois premieres viennent d'un Secret `podium-integration` dans le
namespace du jeu, avec `optional: true` pour que le jeu demarre sans.

---

## 1. Identite (SSO par cookie signe)

A la connexion, Podium pose un cookie **`nqnt_id`** sur `Domain=.danwalex.com`
(configurable). Tous les sous-domaines le recoivent, donc le serveur du jeu le
lit dans chaque requete HTTP **et dans le handshake Socket.IO**
(`socket.handshake.headers.cookie`).

Format : `base64url(payload) + "." + base64url(hmac_sha256(secret, base64url(payload)))`

Payload JSON :

```json
{ "v": 1, "pid": "u_8f3k2…", "pseudo": "Alexis", "avatar": "🦊", "exp": 1760000000 }
```

- `pid` : identifiant stable du compte Podium. **C'est lui qu'on renvoie dans
  les resultats**, jamais le pseudo seul.
- `exp` : epoch **secondes**. Refuser si depasse.
- Comparaison HMAC en temps constant (`crypto.timingSafeEqual`).
- Le jeu ne fait **jamais** confiance a un `pid` envoye par le client : il le
  lit lui-meme dans le cookie, cote serveur, au moment du join.

Reference : `docs/podium-client.js` (fonction `readIdentity(cookieHeader)`).

Comportement attendu dans le jeu :

- Exposer `GET /api/podium/me` → `{ pid, pseudo, avatar }` ou `{}`. Le
  formulaire de join pre-remplit le pseudo (modifiable) et affiche un petit
  badge « connecte via Podium ».
- Au join (socket), le serveur lit le cookie du handshake et stocke `podiumPid`
  sur le participant/joueur. Le pseudo saisi reste celui affiche en jeu.
- Sans cookie valide : rien ne change, le jeu fonctionne comme avant.

---

## 2. Resultats

`POST {PODIUM_URL}/api/v1/games/{slug}/results`
`Authorization: Bearer {PODIUM_GAME_KEY}` — `Content-Type: application/json`

```json
{
  "matchId": "ABC123-1725200000000",
  "mode": "classic",
  "challengeId": null,
  "playedAt": 1725200000000,
  "durationS": 1830,
  "meta": { "playlist": "Annees 90", "rounds": 15 },
  "players": [
    { "pid": "u_8f3k2…", "nickname": "Alexis", "avatar": "🦊", "score": 1240, "rank": 1 },
    { "pid": null,        "nickname": "Invite", "avatar": "🐸", "score": 980,  "rank": 2 }
  ]
}
```

- `matchId` : **cle d'idempotence** par jeu. Rejouer le meme envoi ne cree pas
  de doublon (reponse `200` avec `duplicate: true`). Utiliser
  `code + horodatage de fin` ou l'id de session.
- `mode` : libre, en minuscules (`classic`, `buzzer`, `artist`, `daily`,
  `beat`, …). Podium l'affiche et les defis peuvent filtrer dessus.
- `challengeId` : si la partie a ete jouee dans le cadre d'un defi « mode »
  publie par Podium (voir §3), son id. Sinon `null`.
- `players` : **tous** les joueurs classes. `rank` commence a 1, les egalites
  partagent le rang. `score` est un nombre, dans l'unite du jeu. `pid` vaut
  `null` pour un joueur non connecte a Podium : il apparait dans l'historique
  mais n'entre ni au ranked ni aux defis.
- Les parties a **un seul joueur** (modes solo) ne modifient pas l'Elo ; elles
  comptent pour les defis dont le mode correspond.
- Podium ignore les parties a zero joueur.

Reponse :

```json
{
  "ok": true, "matchId": "ABC123-1725200000000", "duplicate": false,
  "ratings": [ { "pid": "u_8f3k2…", "before": 1000, "after": 1018, "tier": "Argent" } ]
}
```

Le jeu peut relayer `ratings` aux joueurs (evenement `podium:ratings`) pour
afficher « +18 » a l'ecran de fin. Facultatif.

Robustesse : timeout 8 s, une nouvelle tentative apres 5 s, puis on abandonne
en loguant. **Un hub injoignable ne doit jamais faire echouer une fin de
partie.**

Codes : `401` cle invalide, `404` jeu inconnu, `422` payload invalide (corps
`{ error }`), `200` sinon.

---

## 3. Defis actifs

`GET {PODIUM_URL}/api/v1/games/{slug}/challenges/active` — public, sans cle.

```json
{
  "now": 1725200000000,
  "challenges": [
    {
      "id": "ch_9k2…", "slug": "refrain-daily-2026-09-01",
      "kind": "mode", "mode": "daily", "period": "daily",
      "title": "Musique du jour", "description": "Six ecoutes pour trouver le morceau.",
      "seed": "1f0a…", "params": {},
      "startsAt": 1725148800000, "endsAt": 1725235199999
    },
    {
      "id": "ch_7h1…", "slug": "refrain-w36-victoires",
      "kind": "auto", "metric": "wins", "period": "weekly",
      "title": "Serial gagnant", "description": "Le plus de victoires cette semaine.",
      "startsAt": …, "endsAt": …
    }
  ]
}
```

- `kind: "auto"` : calcule par Podium a partir des resultats normaux. Le jeu
  n'a rien a faire, il peut juste l'afficher.
- `kind: "mode"` : le jeu **implemente** le mode. La `seed` est stable pour
  toute la periode : c'est elle qui rend le contenu identique pour tout le
  monde (meme morceau du jour, meme pack de samples). Les resultats de ce mode
  se postent avec `challengeId` = `id` et `mode` = `mode`.
- Cache cote jeu : 5 minutes suffisent. Si Podium est injoignable, un mode
  quotidien peut se rabattre sur `seed = "YYYY-MM-DD"` et `challengeId = null`
  (la partie compte alors comme une partie normale du mode, sans defi).

Un jeu declare ses modes dans sa fiche Podium (`/admin/jeux`), par exemple
`{ "id": "daily", "label": "Musique du jour", "period": "daily", "metric": "best_score" }`.
Podium cree alors un defi par periode, avec sa graine.

---

## Recette locale

```bash
# hub
cd ~/podium && SSO_SECRET=devsecret npm run dev          # http://localhost:3000
# jeu (autre port)
PORT=3001 PODIUM_URL=http://localhost:3000 PODIUM_SSO_SECRET=devsecret \
PODIUM_GAME_KEY=<cle admin> npm run dev
```

Sur `localhost`, les cookies ignorent le port : le cookie pose par le hub est
lu par le jeu sans `Domain` particulier.
