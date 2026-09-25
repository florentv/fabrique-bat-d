# Écran du hall — mode d'emploi pour le conseil syndical

Tout se modifie dans trois Google Sheets partagés avec le CS : **actus**, **infos** et **config**.
Les changements apparaissent sur l'écran **en 5 minutes au plus**. Il n'y a rien d'autre à faire.

---

## Ajouter une actualité (classeur `actus`)

Ajoutez une ligne :

| Colonne | À remplir | Exemple |
|---|---|---|
| **titre** | Court : 6 à 8 mots | Coupure d'eau jeudi matin |
| **texte** | 2 ou 3 phrases. Pour aller à la ligne dans une cellule : Ctrl + Entrée | Jeudi 2 octobre de 9 h à 12 h… |
| **categorie** | Au choix : Travaux, Vie de la copro, Événement, Sécurité… ou **Important** (voir plus bas) | Travaux |
| **image** | Facultatif : lien vers une photo (voir plus bas) | |
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

### Ajouter une photo
1. Déposez la photo dans le dossier Google Drive partagé du CS (format paysage de préférence).
2. Clic droit › *Partager* › Accès général : **« Tous les utilisateurs disposant du lien »**.
3. *Copier le lien* et collez-le dans la colonne **image**.

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
- En cas de souci (écran noir, informations figées), prévenez **[nom du référent technique]**.
