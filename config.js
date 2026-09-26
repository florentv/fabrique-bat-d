// Réglages techniques de l'affichage.
// Le contenu (actus, infos, nom de la résidence…) se modifie dans le Google Sheet, pas ici.
window.CONFIG = {
  // Google Sheet de l'immeuble (lien de partage ou identifiant), avec trois onglets : actus, infos, config.
  // Partagé en « Tous les utilisateurs disposant du lien ». Remplacé par ?sheet=… s'il figure dans l'adresse.
  // Laisser vide pour utiliser les données d'exemple du dossier data/.
  sheet: "https://docs.google.com/spreadsheets/d/1w7kjQKCnq_MkaLyQpqJHIDLT8yg6XEvDt-EnflnZqY0/edit?usp=sharing",

  // Google Sheet modèle proposé en copie sur la page installation.html (lien de partage ou identifiant).
  sheetModele: "",

  // Position par défaut pour la météo (12 rue Paul Bert, 92400 Courbevoie).
  // Chaque immeuble peut préciser la sienne dans l'onglet config (lignes latitude et longitude).
  latitude: 48.9034,
  longitude: 2.2597,

  // Thèmes graphiques disponibles (fichiers du dossier themes/) et thème par défaut.
  // Le thème peut aussi être choisi dans l'onglet config (ligne « style ») ou dans l'adresse (?style=nom).
  styles: ["classique", "moderne"],
  style: "moderne",

  refreshDataMinutes: 1,      // relecture du Google Sheet
  refreshWeatherMinutes: 15,  // relecture de la météo
  reloadHour: 3,              // rechargement complet de la page chaque nuit (heure)
  nightStart: 21,             // thème sombre à partir de… (onglet config : nuit_debut)
  nightEnd: 7,                // …jusqu'à (onglet config : nuit_fin)
  defaultSlideSeconds: 12,    // durée d'affichage d'une actu si non précisée dans le Sheet
};
