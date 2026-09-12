# Appliquer AGARTHA a une application Next (Podium, Refrain, Arena)

AGARTHA V0.4.0 « Liturgie » : os (#D9D2C3) sur noir (#060505). Le sang
(#E8362C, #8E1B1B) uniquement pour ce qui vit : timer, buzz, score qui change,
focus. L'or (#C99A2E) pour le rang et le sacre : hote, premier, verrou — **un
seul element d'or par ecran**. Tout le reste est de l'os en six opacites.
Aucun autre gris, aucune autre couleur.

## 0. Ce qu'on copie

| Source (`~/podium/design/agartha/`) | Destination dans l'app |
|---|---|
| `socle.css` | `app/agartha.css` |
| `fonts/DepartureMono-Regular.woff2` | `public/fonts/DepartureMono-Regular.woff2` |
| `fonts.ts` | `lib/fonts.ts` |
| `hex.ts` | `lib/hex.ts` |
| `toast-reference.md` | a appliquer dans `lib/toast.ts` et `components/Toaster.tsx` |

`app/globals.css` commence par `@import './agartha.css';` puis ne contient que
les specificites de l'app, reecrites avec les jetons AGARTHA. Les modules CSS
(`*.module.css`) sont reecrits de meme. **Aucun ancien jeton ne doit survivre** :

```
grep -rnE "var\(--(violet|indigo|cyan|pink|lime|amber|red|green|surface|surface-2|surface-3|panel|stroke|stroke-strong|text|muted|faint|r-sm|r-md|r-lg|r-xl|shadow-1|shadow-2|glow|ease|display|body|accent-2|bg-soft)\)" app components
```
doit rendre zero ligne a la fin.

## 1. Correspondance des anciens jetons

| Ancien | AGARTHA |
|---|---|
| `--bg`, `--bg-soft`, `--panel` | `var(--bg)` |
| `--surface` | `var(--ink-06)` (repos) |
| `--surface-2` | `var(--ink-12)` (survol) |
| `--surface-3` | `var(--ink-25)` |
| `--stroke` | `var(--ink-25)` — filet |
| `--stroke-strong` | `var(--ink)` — filet fort |
| `--text` | `var(--ink)` |
| `--muted` | `var(--ink-60)` |
| `--faint` | `var(--ink-40)` |
| `--violet`, `--indigo`, `--cyan`, `--pink`, `--lime`, `--green`, `--accent-2` | `var(--ink)` — sauf si la valeur est vivante (timer, buzz, delta) : `var(--accent)` |
| `--amber` | `var(--gold)` si c'est un rang, sinon `var(--ink)` |
| `--red` | `var(--accent)` pour un signal vivant ; pour une erreur : filet `var(--ink)` + hachures `var(--hatch)` |
| `--r-*` | `0` (supprimer la declaration) |
| `--shadow-*`, `--glow` | supprimer |
| `--ease` | `var(--ease-hold)` — ou supprimer la transition |
| `--display` | `var(--font-display)` avec un raccourci `--t-h1`/`--t-h2`/`--t-display` |
| `--body` | `var(--font-mono)` avec `--t-ui`/`--t-meta` |

## 2. Interdits (grep avant de commiter)

- `border-radius` autre que 0 · `box-shadow` · `linear-gradient` ·
  `radial-gradient` · `backdrop-filter` · `blur(` · `opacity` animee ·
  `transition` (sauf `none`) · `ease`, `ease-in-out`, `cubic-bezier`.
- Couleurs hexadecimales autres que les cinq du systeme. Zero `rgba(` hors
  jetons (les gris sont des opacites de l'os : `--ink-90 … --ink-06`).
- Emoji decoratifs dans les libelles, titres et boutons : on les retire. Les
  avatars restent (ce sont des identites), rendus en niveaux d'os par `.avatar`.
  Le pictogramme de la marque se tait (`.brand-mark { display:none }`).
- Coins arrondis « pilule » : `.pill`, `.btn`, `.avatar` sont des rectangles.

## 3. Typographie et ton

- `body` est en capitales (`text-transform: uppercase`). Ne pas remettre de
  minuscules. Exceptions deja gerees : `code`, `pre`, `.keybox`, `.no-caps`,
  champs URL / e-mail / mot de passe, `textarea`.
- Titres : Archivo, `font: var(--t-h1)` (40.5) ou `var(--t-h2)` (27) ou
  `var(--t-display)` (affiche, codes de salle) + `letter-spacing: var(--ls-display)`.
- Interface : `var(--t-ui)` (18) ; libelles, metadonnees, badges : `var(--t-meta)` (12) ;
  grosses donnees : `var(--t-data)` (60) ; UI large : `var(--t-ui-l)` (27). Toujours
  `letter-spacing: var(--ls-mono)` avec la mono.
- Numerotation hexadecimale pour les rangs, manches, compteurs : `hex(n)` →
  `0x03`, `hexOf(3, 12)` → `0x03 / 0x0C`. 0x00 est le systeme, les humains
  commencent a 0x01. Nombres avec espace fine : `fmtInt(1480)`.
- Separateur « · » entre metadonnees. Ton systeme, sec, jamais « fun » :
  « SUJET 0x04 · PRET », « MANCHE 0x03 · EN COURS », « REPONSE ACCEPTEE · +120 »,
  « SALLE INTROUVABLE ». Les joueurs sont des « sujets » dans les libelles
  systeme quand c'est naturel ; on garde « joueur » dans les phrases adressees a
  l'utilisateur si « sujet » devient absurde.
- Espacement base 4 : `--sp-1 … --sp-32`. 1–2 intra · 3–4 padding · 6–8 entre
  composants · 12–16 entre blocs · 24–32 entre sections. Marge de page `var(--margin)`.

## 4. Composants du systeme → pieces du jeu

| Systeme (CMP) | Regle | Ou ca tombe |
|---|---|---|
| Boutons 0x01 | `.btn` secondaire ; `.btn.primary` inversion ; `.btn.ghost` fantome ; `.btn.danger` destructif (bande hachuree a gauche) ; tailles `.sm` 28 / M 40 / `.lg` 56 | partout |
| Buzzer 0x02 | carre `aspect-ratio:1`, filet os, reperes de coin 8×8 (`.corners` + `<span class="corner-b"/>`), « BUZZ » en `--t-h1`, arme = fond nu, presse = `--accent-deep` + filet sang + flash 80 ms, verrouille = dither 25 + os .40 + « BUZZ » barre | Refrain `/play` mode buzzer |
| Champs 0x03 | `.input` 40 px, filet .25, survol os, focus sang, erreur filet os + bande hachuree 4 px ; code de partie = 4 cases 48×56 en `--t-ui-l` avec curseur bloc sang qui clignote | JoinForm, reponses, pseudo |
| Carte de jeu 0x04 | filet .25, `min-height:208px`, en-tete meta (`SALLE 0x1F4A · DISPONIBLE` / `04/08`), titre `--t-h2`, pied meta + action encadree ; complet = dither 25 ; verrouille = bande `--hatch-gold` 8 px + action or ; erreur = hachures | Podium cartes de jeu, Refrain listes |
| Carte joueur 0x05 | grille `48px 1fr auto`, avatar 48 dither, pseudo `--t-ui`, sous-ligne meta, score `--t-ui-l` (sang s'il bouge) ; buzz = filet sang + badge BUZZ `blink-inv` ; elimine = dither 25 + barre ; hors ligne = os .40 | lobbies, listes de joueurs |
| Timer 0x06 | chiffres `--t-data` tabulaires au dixieme, barre 8 px filet .25 pleine os qui **saute** par pas (jamais de glissement, `transition:none`), urgence < 5 s : chiffres et barre en sang, libelle qui clignote ; ecoule : chiffres os .40, barre en hachures ; pause : os .40 + dither | Refrain manche, Arena chrono |
| Scoreboard 0x07 | lignes `56px 1fr auto 88px`, filet entre lignes, rang en hex, `0x01` sur aplat **or** (le seul or), delta en sang, « VOUS » = fond `--ink-06` + badge VOUS, elimine = dither + barre, hors ligne os .40 ; podium = 3 colonnes 192/128/96, premier en or plein, autres en dither 50/25 | classements, ecrans de fin |
| Badges 0x08 | `.pill` 24 px ; `.ok` os, `.live` sang, `.gold` or (hote), `.off`, `.dead`, `.err` ; pastille 8×8 `.dot` (blink en steps) | etats |
| Progression 0x09 | un segment par manche, `height:8px`, `gap:4px` ; faite = os plein, en cours = sang qui clignote, a venir = filet .25, annulee = hachures, pause = dither | manches, phases |
| Modales 0x0A | voile = `--veil` (dither 75 % couleur fond), jamais de flou ; boite filet os, fond noir, reperes de coin, largeur max 440, `padding: var(--sp-6)`, en-tete meta avec compte a rebours en sang, titre `--t-h2` | revelation, fin de partie |
| Messages 0x0B | voir `toast-reference.md` | Toaster |
| En-tete de partie 0x0C | code de salle en `--t-h1`/`--t-display` Archivo, compteur de sujets en carres 12×12 (os = present, filet = libre, hachures = deconnecte), manche `0x03 / 0x0C`, latence = donnee vivante en sang | ecrans host/screen/play |
| Plaque d'identification | filet, reperes de coin, motif grave SVG or a .35 en fond a droite, metadonnees plausibles | profil joueur, ecran de projection en attente |

Le fond n'a plus d'aurore : `<Aurora/>` rend seulement `<div className="grain" aria-hidden />`.
Aucun `backdrop-filter`, aucun halo.

## 5. Ecran de projection (Refrain `/screen`, Arena `/screen`)

C'est l'ecran que tout le monde regarde : il porte l'univers. Code de salle en
`--t-display` (jusqu'a 205 px), QR code encadre d'un filet os sur fond os pur
(le QR reste noir sur clair pour se scanner), barre systeme en haut
(`SALLE K7X2 · MANCHE 0x03 / 0x0C · SUJETS 06/08 · LATENCE 41 MS`), timer en
`--t-data` avec sa barre, classement en lignes de scoreboard, revelation en
modale a voile dither. 40 % de vide minimum : on n'empile pas.

## 6. Verification avant de pousser

```
npm run typecheck && npm run build && npm test   # et les suites propres a l'app
grep -rnE "border-radius: ?[1-9]|box-shadow|linear-gradient|radial-gradient|backdrop-filter|blur\(|cubic-bezier|ease-in|ease-out" app components | grep -v agartha.css
grep -rnE "#[0-9a-fA-F]{3,8}\b" app components --include=*.css | grep -vE "060505|D9D2C3|E8362C|8E1B1B|C99A2E" | grep -v agartha.css
```
Les deux greps doivent etre vides (les QR codes et data-URI de textures sont
les seules exceptions tolerees, dans `agartha.css`). Demarrer le serveur et
verifier que chaque page repond 200 et que le HTML contient bien les classes
attendues. Un navigateur headless n'est pas disponible sur cette machine.

## 7. Git

Branche `agartha` creee depuis la branche `podium-integration` du depot
(`git checkout -b agartha podium-integration`), commits en francais au present
sans emoji, `git push -u origin agartha`. Pas de merge, pas de push sur main,
pas de deploiement : le deploiement est fait ensuite depuis le hub.
