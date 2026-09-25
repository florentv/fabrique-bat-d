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
| `index.html`, `style.css`, `app.js`, `icons.js` | Le site |
| `config.js` | Réglages techniques : coordonnées météo, liens des Google Sheets, horaires du thème nuit |
| `data/*.csv` | Données d'exemple (utilisées si un lien est laissé vide dans `config.js`) et modèles d'import pour Google Sheets |
| `sw.js` | Cache hors ligne : le site redémarre même sans Wi-Fi |
| `fonts/` | Atkinson Hyperlegible et Fraunces (licence SIL OFL), hébergées localement |
| `GUIDE-CONSEIL.md` | Fiche d'utilisation pour le conseil syndical |

## 1. Tester en local

```bash
python3 -m http.server 8000
```

Ouvrir http://localhost:8000. Dans Chrome, les outils de développement (mode appareil, 1080×1920) simulent la tablette.

Paramètres d'aperçu : `?slide=3` démarre sur la 3e actu, `?theme=nuit` ou `?theme=jour` force le thème.

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

Une modification dans un Google Sheet apparaît donc sur l'écran en 5 minutes au plus. Chaque lecture contourne les caches, pour ne jamais récupérer une ancienne version.

En cas d'erreur ou de coupure réseau, les dernières données valides restent affichées et le pied de page indique « Hors ligne ». L'affichage reprend tout seul au retour de la connexion.

### Affichage

- **Actus** : seules celles qui sont actives et dans leur période (`debut` ≤ aujourd'hui ≤ `fin`) sont affichées. Elles apparaissent et disparaissent le jour dit, sans intervention. Un texte trop long est automatiquement réduit pour tenir sur l'écran.
- **Thème nuit** : de 21 h à 7 h.
- **Protection de l'écran** : léger décalage de quelques pixels toutes les 10 min, pour éviter que l'image se marque sur la dalle.
