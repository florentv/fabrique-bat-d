# Affichage de la résidence — tablette du hall

Mini-site affiché en plein écran sur la tablette Android (portrait, 1080×1920) :
heure, météo, actualités en carrousel, informations pratiques.
Le contenu est géré par le conseil syndical dans des **Google Sheets**.

```
Google Sheet (CS) ──CSV──▶ site statique (GitHub Pages) ──▶ tablette (Fully Kiosk Browser)
Open-Meteo ─────météo────▶
```

## Structure

| Fichier | Rôle |
|---|---|
| `index.html`, `style.css`, `app.js`, `icons.js` | Le site (`style.css` : mise en page commune à tous les thèmes) |
| `themes/` | Thèmes graphiques : `classique.css` (base, toujours chargée), `moderne.css` (par défaut), `_modele.css` (point de départ pour un nouveau thème) |
| `config.js` | Réglages techniques : coordonnées météo, liens des Google Sheets, horaires du thème nuit |
| `data/*.csv` | Données d'exemple (utilisées si un lien est laissé vide dans `config.js`) et modèles d'import pour Google Sheets |
| `sw.js` | Cache hors ligne : le site redémarre même sans Wi-Fi |
| `fonts/` | Atkinson Hyperlegible, Fraunces et Poppins (licence SIL OFL), hébergées localement |
| `GUIDE-CONSEIL.md` | Fiche d'utilisation pour le conseil syndical |

## 1. Tester en local

```bash
python3 -m http.server 8000
```

Ouvrir http://localhost:8000. Dans Chrome, les outils de développement (mode appareil, 1080×1920) simulent la tablette.

Paramètres d'aperçu : `?slide=3` démarre sur la 3e actu, `?theme=nuit` ou `?theme=jour` force le thème.

## Thèmes graphiques

| Thème | Style |
|---|---|
| `classique` | Ivoire, bronze, titres à empattements (Fraunces), texte Atkinson Hyperlegible |
| `moderne` (par défaut) | Gris chaud, cuivre, sans-serif géométrique très grasse (Poppins), étiquettes au trait, progression des actus en segments |

Le thème **classique** est toujours chargé. Un autre thème s'y superpose et ne redéfinit que ce qui change (couleurs, polices, arrondis, voire des règles de style).

**Créer un thème**
1. Copier `themes/_modele.css` en `themes/<nom>.css` (minuscules, sans espace ni accent).
2. Décommenter et modifier les variables voulues, pour le jour (`:root`) et la nuit (`.night`).
3. Ajouter `<nom>` à la liste `styles` de `config.js`.

**Choisir le thème affiché**, par ordre de priorité :

| Où | Comment | Usage |
|---|---|---|
| Adresse | `?style=<nom>` (combinable avec `&theme=nuit`) | Tester sans rien modifier |
| Classeur `config` | ligne `style` \| `<nom>` | Changer le thème de la tablette, en 1 minute, sans `git push` |
| `config.js` | `style: "<nom>"` | Thème par défaut |

Un nom inconnu, ou absent de la liste `styles`, ramène au thème classique.

Pour les thèmes qui en ont besoin, la page fournit quelques éléments masqués par défaut dans `style.css` : le nom de la résidence découpé autour du tiret (`.brand-main`, `.brand-sep`, `.brand-sub`), les segments de progression des actus (`.news-steps`), et la mention « min » dans les prévisions (`.weather-day-min`).

## 2. Google Sheets

Le contenu est réparti dans **trois classeurs Google Sheets** (un par type de contenu) :

| Classeur | Modèle d'import |
|---|---|
| actus | `data/actus.csv` |
| infos | `data/infos.csv` |
| config | `data/config.csv` |

Pour chaque classeur :
1. *Fichier › Importer* le modèle correspondant. Seul le **premier onglet** du classeur est lu.
2. *Partager* › Accès général : **« Tous les utilisateurs disposant du lien » (Lecteur)**. Ajouter les membres du CS en tant qu'**éditeurs**.
3. Copier le lien de partage dans `config.js` (`sheets.actus`, `sheets.infos`, `sheets.config`). Le site le convertit lui-même en CSV : pas besoin de « Publier sur le web ».

Dans `actus`, ajouter une validation de données sur `actif` (liste `oui,non`) et saisir les dates au format JJ/MM/AAAA.

> ⚠️ Toute personne qui a le lien peut lire les classeurs. N'y mettez rien qui ne pourrait pas être affiché dans le hall.
> Le site relit les classeurs toutes les 5 minutes : une modification apparaît donc en 5 minutes au plus.

## 3. Mise en ligne (GitHub Pages)

- Dépôt : https://github.com/florentv/fabrique-bat-d (public)
- Site : **https://florentv.github.io/fabrique-bat-d/**. Publié depuis la branche `main`, à la racine (*Settings › Pages*).

Chaque `git push` sur `main` met le site à jour ; la tablette récupère la nouvelle version au plus tard lors du rechargement de 3 h du matin.

## 4. Tablette

La tablette utilise déjà un navigateur en mode kiosque. Points à vérifier dans ses réglages :
- l'adresse de démarrage est l'URL du site ci-dessus ;
- l'écran reste allumé, et l'application se lance au démarrage de la tablette ;
- la page se recharge automatiquement après une coupure réseau ou une erreur, si le logiciel le permet.

## Comportement automatique

### Rafraîchissement

La page reste ouverte en permanence et relit ses sources en arrière-plan, sans se recharger. Si le contenu n'a pas changé, rien ne bouge à l'écran et le carrousel continue normalement.

| Quoi | Quand | Réglage (`config.js`) |
|---|---|---|
| Actus, infos pratiques, réglages (Google Sheets) | toutes les 5 min | `refreshDataMinutes` |
| Météo (Open-Meteo, gratuit et sans clé d'API) | toutes les 15 min | `refreshWeatherMinutes` |
| Code du site (après un `git push`) | au rechargement complet de la page, chaque nuit à 3 h | `reloadHour` |
| Heure et date | à la minute | — |

**Heure exacte** : l'horloge de la tablette peut dériver, et ses réglages ne sont pas accessibles. À chaque lecture des Google Sheets, le site compare l'heure de la tablette à celle du serveur Google (en-tête `Date` de la réponse) et corrige l'affichage, à la seconde près. L'écart est mémorisé pour rester valable hors ligne. Le thème nuit, le rechargement de 3 h et les dates des actus utilisent aussi cette heure corrigée. Pour tester : `?horloge=300` simule une tablette en avance de 5 minutes.

Une modification dans un Google Sheet apparaît donc sur l'écran en 5 minutes au plus. Chaque lecture contourne les caches, pour ne jamais récupérer une ancienne version.

En cas d'erreur ou de coupure réseau, les dernières données valides restent affichées et le pied de page indique « Hors ligne ». L'affichage reprend tout seul au retour de la connexion.

### Affichage

- **Actus** : seules celles qui sont actives et dans leur période (`debut` ≤ aujourd'hui ≤ `fin`) sont affichées. Elles apparaissent et disparaissent le jour dit, sans intervention. Un texte trop long est automatiquement réduit pour tenir sur l'écran.
- **Thème nuit** : de 21 h à 7 h.
- **Protection de l'écran** : léger décalage de quelques pixels toutes les 10 min, pour éviter que l'image se marque sur la dalle.
