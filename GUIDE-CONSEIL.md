# Tablette Hall Batiment D
## Mode d'emploi

Le mini-site affiché sur la tablette est relié à trois tableaux Google Sheets : 
* **actus** qui permet d'ajouter/supprimer/modifier une actualité : https://docs.google.com/spreadsheets/d/1w7kjQKCnq_MkaLyQpqJHIDLT8yg6XEvDt-EnflnZqY0/edit?usp=sharing 
* **infos** qui permet de modifier les infos en bas de page : https://docs.google.com/spreadsheets/d/1TdVMvlzHhrDRHKBKn9zHS1B7fJAN5wGhc6XUUntArl8/edit?usp=sharing
* **config** qui permet de modifier les paramètres d'affichage : https://docs.google.com/spreadsheets/d/1LIXl29jjvBakqBnDMfwQDIEACr8cOAhUGn4Nhtiyh4c/edit?usp=sharing

Vous devez posséder un compte Google et avoir les autorisations de modifier chaque Google Sheets.

Les changements apparaissent sur l'écran **en 5 minutes au plus**. Il n'y a rien d'autre à faire.

---

## Ajouter une actualité (classeur `actus`)

Ajoutez une ligne :

| Colonne | À remplir | Exemple |
|---|---|---|
| **titre** | Court : 6 à 8 mots | Coupure d'eau jeudi matin |
| **texte** | 2 ou 3 phrases. Pour aller à la ligne dans une cellule : Ctrl + Entrée | Jeudi 2 octobre de 9 h à 12 h… |
| **categorie** | Au choix : Travaux, Vie de la copro, Événement, Sécurité… ou **Important** (voir plus bas) | Travaux |
| **debut** | Date d'apparition sur l'écran | 24/09/2026 |
| **fin** | Date de disparition (l'actu est encore affichée ce jour-là) | 02/10/2026 |
| **actif** | `oui` ou `non` (`non` masque l'actu sans la supprimer) | oui |

- Les actus défilent **dans l'ordre des lignes**. Déplacez une ligne pour changer l'ordre.
- Une actu dont la date de fin est passée disparaît toute seule. Inutile de la supprimer.
- Une actu trop longue est réduite automatiquement, mais un texte court reste bien plus lisible.

### Actu importante
Écrivez **Important** dans la colonne `categorie`. L'actu :
- passe **en premier** dans le défilement, quelle que soit sa ligne dans le tableau ;
- s'affiche avec un **cadre rouge** et une étiquette rouge IMPORTANT.

À réserver aux informations vraiment importantes (panne d'ascenseur, coupure d'eau imminente, sécurité…) pour qu'elles gardent leur effet. Pensez à mettre une date de **fin** proche.

---

## Modifier les informations pratiques (classeur `infos`)

Une ligne par bloc :

| Colonne | Contenu |
|---|---|
| **icone** | Un mot parmi : `telephone` `urgence` `personne` `horaire` `poubelle` `recyclage` `cle` `colis` `email` `ascenseur` `eau` `electricite` `velo` `voiture` `calendrier` `wifi` `maison` `info` |
| **titre** | Petit texte gris : « Syndic — Cabinet X » |
| **detail** | Gros texte : « 01 23 45 67 89 » |
| **pleine_largeur** | `oui` pour que le bloc occupe toute la largeur (texte long), sinon laisser vide |

👉 L'idéal est **6 blocs** (3 rangées de 2). Au-delà de 8, l'écran devient chargé.

---

## Réglages généraux (classeur `config`)

| cle | valeur |
|---|---|
| nom_residence | Nom affiché en haut de l'écran |
| adresse | Sous-titre sous le nom |
| duree_actu | Durée d'affichage de chaque actu, en secondes (12 conseillé) |
| message_pied | Petite phrase en bas de l'écran |

⚠️ Ne modifiez pas la colonne `cle`, gardez la ligne d'en-tête (1re ligne) de chaque classeur, et n'ajoutez pas d'onglet avant le premier : c'est lui qui est lu.

---

## Bonnes pratiques

- **Pas de données personnelles** : pas de noms de résidents, pas de numéro d'appartement, pas de code d'accès. L'écran est visible par tous les visiteurs.
- Relisez-vous : l'écran est vu par tout l'immeuble 😉
- En cas de souci (écran noir, informations figées), prévenez **Florent Vié**.

---

## Architecture technique

### Hébergement
Le mini-site est hébergé sur Github Pages. Voici le lien du dossier (repository) : https://github.com/florentv/fabrique-bat-d. 

Ce dossier est administré par Florent Vié. Le contacter pour toute question ou demande de modification.

### Mise à jour du site

Le mini-site affiché sur la tablette est relié à trois tableaux Google Sheets : 
* **actus** qui permet d'ajouter/supprimer/modifier une actualité : https://docs.google.com/spreadsheets/d/1w7kjQKCnq_MkaLyQpqJHIDLT8yg6XEvDt-EnflnZqY0/edit?usp=sharing 
* **infos** qui permet de modifier les infos en bas de page : https://docs.google.com/spreadsheets/d/1TdVMvlzHhrDRHKBKn9zHS1B7fJAN5wGhc6XUUntArl8/edit?usp=sharing
* **config** qui permet de modifier les paramètres d'affichage : https://docs.google.com/spreadsheets/d/1LIXl29jjvBakqBnDMfwQDIEACr8cOAhUGn4Nhtiyh4c/edit?usp=sharing

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