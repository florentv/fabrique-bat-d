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

## 3. Mettre en ligne (GitHub Pages)

1. Créer un dépôt GitHub (en gratuit, il doit être public pour GitHub Pages ; seuls les liens des Google Sheets, en lecture seule, y figurent).
2. Envoyer les fichiers du projet :
   ```bash
   git init && git add . && git commit -m "Affichage résidence"
   git branch -M main
   git remote add origin https://github.com/<compte>/affichage-residence.git
   git push -u origin main
   ```
3. Sur GitHub : *Settings › Pages › Source : Deploy from a branch › main / (root)*.
4. Le site est disponible à l'adresse `https://<compte>.github.io/affichage-residence/`.

Chaque `git push` met le site à jour ; la tablette récupère la nouvelle version au plus tard lors du rechargement de 3 h du matin.

## 4. Configurer la tablette

Installer **Fully Kiosk Browser** depuis le Play Store et acheter la licence PLUS (environ 7 €, pour l'administration à distance). Dans les réglages :

| Réglage | Valeur |
|---|---|
| Web Content Settings › Start URL | l'URL GitHub Pages |
| Device Management › Keep Screen On | ✅ |
| Device Management › Launch on Boot | ✅ |
| Kiosk Mode › Enable Kiosk Mode | ✅ (définir un code PIN) |
| Web Auto Reload › Auto Reload on Network Reconnect | ✅ |
| Web Auto Reload › Auto Reload after Page Error | ✅ |
| Device Management › Scheduled Sleep | par ex. extinction à 23:00, réveil à 06:30 |
| Remote Administration (Fully Cloud) | ✅ pour surveiller et redémarrer à distance |
| Motion Detection (facultatif) | allume l'écran quand quelqu'un passe |

Côté Android :
- désactiver la mise en veille automatique et les mises à jour automatiques du système ;
- activer la limite de charge de la batterie (80 %) si l'appareil la propose ; une batterie branchée en permanence risque de gonfler ;
- régler la luminosité à environ 70 %.

## Comportement automatique

- **Données** : relues toutes les 5 min. En cas d'erreur ou de coupure, les dernières données valides restent affichées et le pied de page indique « Hors ligne ».
- **Météo** : relue toutes les 15 min (Open-Meteo, gratuit et sans clé d'API).
- **Actus** : seules celles qui sont actives et dans leur période (`debut` ≤ aujourd'hui ≤ `fin`) sont affichées. Un texte trop long est automatiquement réduit pour tenir sur l'écran.
- **Thème nuit** : de 21 h à 7 h.
- **Rechargement complet** chaque nuit à 3 h.
- **Protection de l'écran** : léger décalage de quelques pixels toutes les 10 min, pour éviter que l'image se marque sur la dalle.
