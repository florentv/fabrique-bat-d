# Affichage de la résidence — tablette du hall

Mini-site affiché en plein écran sur la tablette Android (portrait, 1080×1920) :
heure, météo, actualités en carrousel, informations pratiques.
Le contenu est géré par le conseil syndical dans un **Google Sheet**. Le site peut servir à plusieurs immeubles (voir « Installer pour un autre immeuble »).

```
Google Sheet (CS) ──CSV──▶ site statique (GitHub Pages) ──▶ tablette (Fully Kiosk Browser)
Open-Meteo ─────météo────▶
```

## Structure

| Fichier | Rôle |
|---|---|
| `index.html`, `style.css`, `app.js`, `icons.js` | Le site (`style.css` : mise en page commune à tous les thèmes) |
| `themes/` | Thèmes graphiques : `classique.css` (base, toujours chargée), `moderne.css` (par défaut), `_modele.css` (point de départ pour un nouveau thème) |
| `config.js` | Réglages par défaut : Google Sheet, coordonnées météo, thème, horaires du thème nuit |
| `installation.html`, `installation.js` | Page d'installation pour un nouvel immeuble : vérification du Sheet, adresse et QR code de la tablette |
| `vendor/qrcode.js` | Générateur de QR codes (qrcode-generator 1.4.4, licence MIT) |
| `data/*.csv` | Données d'exemple (utilisées sans Google Sheet) et modèles d'import des trois onglets |
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
| Onglet `config` | ligne `style` \| `<nom>` | Changer le thème de la tablette, sans `git push` |
| `config.js` | `style: "<nom>"` | Thème par défaut |

Un nom inconnu, ou absent de la liste `styles`, ramène au thème classique.

Pour les thèmes qui en ont besoin, la page fournit quelques éléments masqués par défaut dans `style.css` : le nom de la résidence découpé autour du tiret (`.brand-main`, `.brand-sep`, `.brand-sub`), les segments de progression des actus (`.news-steps`), et la mention « min » dans les prévisions (`.weather-day-min`).

## 2. Google Sheet

Le contenu de chaque immeuble tient dans **un seul Google Sheet**, avec trois onglets nommés exactement :

| Onglet | Contenu | Colonnes obligatoires | Modèle d'import |
|---|---|---|---|
| `actus` | Actualités du carrousel | `titre`, `texte`, `debut`, `fin` | `data/actus.csv` |
| `infos` | Informations pratiques | `icone`, `titre`, `detail` | `data/infos.csv` |
| `config` | Réglages de l'immeuble (`cle` / `valeur`) | `cle`, `valeur` | `data/config.csv` |

Onglet `config` : `nom_residence`, `adresse`, `duree_actu`, `message_pied`, et en option `style`, `latitude`, `longitude` (météo), `nuit_debut`, `nuit_fin`. Sans ces lignes facultatives, les valeurs de `config.js` s'appliquent.

Mise en place :
1. Créer le Google Sheet, puis pour chaque modèle : *Fichier › Importer › Importer*, option **« Insérer de nouvelles feuilles »**. L'onglet créé prend le nom du fichier (`actus`, `infos`, `config`).
2. *Partager* › Accès général : **« Tous les utilisateurs disposant du lien » (Lecteur)**. Ajouter les membres du CS en tant qu'**éditeurs**.
3. Indiquer le Sheet au site, au choix :
   - dans l'adresse de la tablette : `…/?sheet=<lien de partage ou identifiant>` (prioritaire) ;
   - dans `config.js` : `sheet: "<lien de partage>"` (utilisé quand l'adresse ne précise rien).

La page **`installation.html`** vérifie un Sheet (partage, onglets, colonnes) et fournit l'adresse de la tablette avec un QR code.

Si un onglet manque ou est mal structuré, le bas de l'écran l'indique en rouge (par ex. « Onglet « infos » introuvable ou incomplet »). Les dernières données valides restent affichées. Cette vérification est indispensable, car Google renvoie le premier onglet quand un nom d'onglet n'existe pas.

> ⚠️ Toute personne qui a le lien peut lire le Sheet. N'y mettez rien qui ne pourrait pas être affiché dans le hall.

## Installer pour un autre immeuble

Chaque immeuble a sa propre copie du site (*fork* GitHub) et son propre Google Sheet. Le mode d'emploi pas à pas est sur la page `installation.html` du site. En résumé :
1. *Fork* du dépôt, puis activer GitHub Pages sur la copie.
2. Créer le Google Sheet de l'immeuble (voir ci-dessus), et le vérifier avec `installation.html`.
3. Mettre sur la tablette l'adresse fournie : `https://<compte>.github.io/<dépôt>/?sheet=<identifiant>`.

Les copies ne modifient aucun fichier : tout ce qui est propre à l'immeuble est dans le Sheet et dans l'adresse. Le bouton **Sync fork** de GitHub récupère donc les améliorations sans conflit. Pour proposer un Sheet modèle à copier en un clic, renseigner `sheetModele` dans `config.js`.

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

**Heure exacte** : l'horloge de la tablette peut dériver, et ses réglages ne sont pas accessibles. À chaque lecture des Google Sheets, le site compare l'heure de la tablette à celle du serveur Google (en-tête `Date` de la réponse) et corrige l'affichage, à la seconde près. L'écart est mémorisé pour rester valable hors ligne. Le thème nuit, le rechargement de 3 h et les dates des actus utilisent aussi cette heure corrigée. Les heures et les dates sont calculées dans le fuseau `timeZone` de `config.js` (Europe/Paris), quel que soit le fuseau réglé sur la tablette (celle du hall est en UTC). Pour tester : `?horloge=300` simule une tablette en avance de 5 minutes.

Une modification dans un Google Sheet apparaît donc sur l'écran en 5 minutes au plus. Chaque lecture contourne les caches, pour ne jamais récupérer une ancienne version.

En cas d'erreur ou de coupure réseau, les dernières données valides restent affichées et le pied de page indique « Hors ligne ». L'affichage reprend tout seul au retour de la connexion.

### Affichage

- **Actus** : seules celles qui sont actives et dans leur période (`debut` ≤ aujourd'hui ≤ `fin`) sont affichées. Elles apparaissent et disparaissent le jour dit, sans intervention. Un texte trop long est automatiquement réduit pour tenir sur l'écran.
- **Thème nuit** : de 21 h à 7 h.
- **Protection de l'écran** : léger décalage de quelques pixels toutes les 10 min, pour éviter que l'image se marque sur la dalle.
