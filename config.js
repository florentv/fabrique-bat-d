// Réglages techniques de l'affichage.
// Le contenu (actus, infos, nom de la résidence…) se modifie dans le Google Sheet, pas ici.
window.CONFIG = {
  // Localisation pour la météo : 12 rue Paul Bert, 92400 Courbevoie
  latitude: 48.9034,
  longitude: 2.2597,

  // Liens de partage des Google Sheets (partagés en « Tous les utilisateurs disposant du lien »).
  // Laisser vide pour utiliser les données d'exemple du dossier data/.
  sheets: {
    actus: "https://docs.google.com/spreadsheets/d/1w7kjQKCnq_MkaLyQpqJHIDLT8yg6XEvDt-EnflnZqY0/edit?usp=sharing",
    infos: "https://docs.google.com/spreadsheets/d/1TdVMvlzHhrDRHKBKn9zHS1B7fJAN5wGhc6XUUntArl8/edit?usp=sharing",
    config: "https://docs.google.com/spreadsheets/d/1LIXl29jjvBakqBnDMfwQDIEACr8cOAhUGn4Nhtiyh4c/edit?usp=sharing",
  },

  refreshDataMinutes: 1,      // relecture du Google Sheet
  refreshWeatherMinutes: 15,  // relecture de la météo
  reloadHour: 3,              // rechargement complet de la page chaque nuit (heure)
  nightStart: 16,             // thème sombre à partir de…
  nightEnd: 7,                // …jusqu'à
  defaultSlideSeconds: 12,    // durée d'affichage d'une actu si non précisée dans le Sheet
};
