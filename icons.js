// Icônes au trait (viewBox 24x24, stroke = currentColor).
(function () {
  const svg = (body) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

  const sun = '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>';
  const moon = '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>';
  const cloud = '<path d="M7 18.5h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7 11a3.75 3.75 0 0 0 0 7.5z"/>';
  const cloudSmall = '<path d="M8.5 19h8.5a3.5 3.5 0 0 0 .5-6.96A4.8 4.8 0 0 0 8.4 12.5a3.25 3.25 0 0 0 .1 6.5z"/>';
  const sunBehind = '<circle cx="9" cy="8.5" r="3.2"/><path d="M9 2.5v1.3M3 8.5h1.3M4.8 4.3l.9.9M13.2 4.3l-.9.9"/>';
  const moonBehind = '<path d="M13 7.2A4.5 4.5 0 0 1 7.3 2.8a4.5 4.5 0 1 0 5.7 4.4z"/>';
  const rainCloud = '<path d="M7 15h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7 7.5 3.75 3.75 0 0 0 7 15z"/>';

  window.WEATHER_ICONS = {
    clear: svg(sun),
    clearNight: svg(moon),
    partly: svg(sunBehind + cloudSmall),
    partlyNight: svg(moonBehind + cloudSmall),
    cloudy: svg(cloud),
    fog: svg('<path d="M4 9h16M3 13h18M5 17h14"/>'),
    drizzle: svg(rainCloud + '<path d="M9 18.5v.5M13 18.5v.5M17 18.5v.5"/>'),
    rain: svg(rainCloud + '<path d="M8.5 17.5l-1 3M12.5 17.5l-1 3M16.5 17.5l-1 3"/>'),
    snow: svg(rainCloud + '<path d="M8.5 18.5h.01M12 20h.01M15.5 18.5h.01M10 21.5h.01M14 21.5h.01" stroke-width="2.4"/>'),
    storm: svg(rainCloud + '<path d="M12.5 15.5l-2 3.5h3l-2 3.5"/>'),
  };

  // Icônes utilisables dans la colonne « icone » de l'onglet infos.
  window.INFO_ICONS = {
    telephone: svg('<path d="M5 4h3.5l1.5 4.5-2.2 1.3a11 11 0 0 0 6.4 6.4l1.3-2.2L20 15.5V19a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4z"/>'),
    urgence: svg('<path d="M12 3.5 21 19.5H3z"/><path d="M12 10v4M12 17h.01"/>'),
    poubelle: svg('<path d="M4 6.5h16M9.5 6.5V4.5h5v2M6 6.5l1 13.5h10l1-13.5M10 10.5v6M14 10.5v6"/>'),
    recyclage: svg('<path d="M7 19h10M9 19l-4.5-7.5 3-5M15 19l4.5-7.5-3-5M7.5 6.5h9M12 3l-4.5 3.5M12 3l4.5 3.5"/>'),
    cle: svg('<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2 2M14 9l1.5 1.5"/>'),
    horaire: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    colis: svg('<path d="M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4z"/><path d="M3.5 7.5 12 11.5l8.5-4M12 11.5v9"/>'),
    email: svg('<rect x="3" y="5.5" width="18" height="13" rx="1.5"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>'),
    personne: svg('<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>'),
    ascenseur: svg('<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9.5 10 12 7.5l2.5 2.5M9.5 14l2.5 2.5 2.5-2.5"/>'),
    eau: svg('<path d="M12 3.5s6 6.8 6 11a6 6 0 0 1-12 0c0-4.2 6-11 6-11z"/>'),
    electricite: svg('<path d="M13 2.5 5.5 13.5H12l-1 8 7.5-11H12z"/>'),
    velo: svg('<circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="M6 16l4-8h5l3 8M10 8l2 8h-6M9 5.5h3"/>'),
    voiture: svg('<path d="M4 16.5V12l2-5h12l2 5v4.5M3.5 12h17"/><circle cx="7.5" cy="16.5" r="1.8"/><circle cx="16.5" cy="16.5" r="1.8"/>'),
    calendrier: svg('<rect x="3.5" y="5" width="17" height="15.5" rx="1.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>'),
    wifi: svg('<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.7 16a5 5 0 0 1 6.6 0M12 19.5h.01"/>'),
    maison: svg('<path d="M3.5 11 12 4l8.5 7M5.5 9.5V20h13V9.5M10 20v-5.5h4V20"/>'),
    info: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8h.01"/>'),
  };
})();
