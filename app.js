(function () {
  "use strict";

  const C = window.CONFIG;
  const $ = (id) => document.getElementById(id);
  const MIN = 60 * 1000;
  const startedAt = Date.now();
  // Paramètres d'aperçu : ?slide=2 (démarrer sur la 2e actu), ?theme=nuit ou ?theme=jour
  const params = new URLSearchParams(location.search);
  const forcedTheme = params.get("theme");
  const forcedStyle = params.get("style");
  // Test uniquement : ?horloge=300 simule une tablette en avance de 300 s (négatif = en retard).
  const simulatedSkew = (+params.get("horloge") || 0) * 1000;

  // Google Sheet de l'immeuble : ?sheet=<lien ou identifiant> dans l'adresse, sinon config.js.
  // Sans Sheet, le site affiche les données d'exemple du dossier data/.
  function sheetIdFrom(value) {
    const v = String(value || "").trim();
    const m = v.match(/spreadsheets\/d\/([\w-]{20,})/);
    if (m) return m[1];
    return /^[\w-]{20,}$/.test(v) ? v : "";
  }
  const SHEET_ID = sheetIdFrom(params.get("sheet")) || sheetIdFrom(C.sheet);

  const state = {
    settings: {},
    news: [],
    newsKey: "",
    slideIndex: Math.max(0, (+params.get("slide") || 1) - 1),
    slideTimer: null,
    lastSync: null,
    offline: false,
    problem: "",       // erreur de structure du Sheet, affichée en pied de page
  };

  // ---------- Utilitaires ----------

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function normalizeKey(s) {
    return String(s).trim().toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  }

  // Parseur CSV (guillemets, virgules et retours à la ligne dans les cellules).
  function parseCsv(text) {
    const rows = [];
    let row = [], field = "", quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') quoted = false;
        else field += c;
      } else if (c === '"') quoted = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c !== "\r") field += c;
    }
    if (field !== "" || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function csvToObjects(text) {
    const [header, ...rows] = parseCsv(text.replace(/^﻿/, ""));
    if (!header) return [];
    const keys = header.map(normalizeKey);
    const objects = rows
      .filter((r) => r.some((v) => v.trim() !== ""))
      .map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
    objects.columns = keys;
    return objects;
  }

  // Accepte JJ/MM/AAAA, JJ/MM/AA et AAAA-MM-JJ. Renvoie ce jour à midi UTC,
  // qui tombe le même jour calendaire dans le fuseau de l'immeuble.
  function parseDate(s) {
    if (!s) return null;
    let m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
    if (m) {
      const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
      return new Date(Date.UTC(y, +m[2] - 1, +m[1], 12));
    }
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12));
    return null;
  }

  const isYes = (v) => /^(oui|o|yes|y|x|1|vrai|true)$/i.test(String(v).trim());
  const isNo = (v) => /^(non|n|no|0|faux|false)$/i.test(String(v).trim());

  // Transforme un lien de partage Google Drive en lien d'image affichable.
  function imageUrl(url) {
    if (!url) return "";
    const m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?.*id=)([\w-]{10,})/);
    return m ? `https://lh3.googleusercontent.com/d/${m[1]}=w1600` : url;
  }

  // Heures et dates dans le fuseau de l'immeuble, quel que soit le fuseau réglé sur la tablette
  // (celle du hall est en UTC et ses réglages ne sont pas accessibles).
  const TZ = C.timeZone || "Europe/Paris";
  const fmtTime = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
  const fmtDate = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
  const fmtShort = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, day: "numeric", month: "long" });
  const fmtDay = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, weekday: "short" });
  const fmtParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });

  // Date et heure d'un instant dans le fuseau de l'immeuble ; day = AAAAMMJJ, pour comparer des jours.
  function zoned(date) {
    const p = Object.fromEntries(fmtParts.formatToParts(date).map((x) => [x.type, +x.value]));
    return { hour: p.hour % 24, minute: p.minute, day: p.year * 10000 + p.month * 100 + p.day };
  }

  // ---------- Heure corrigée ----------
  // L'horloge de la tablette peut dériver et ses réglages ne sont pas accessibles.
  // On mesure l'écart avec l'heure des serveurs (en-tête Date des réponses) et on le compense.

  const deviceNow = () => Date.now() + simulatedSkew;
  const clock = { offset: 0, samples: [] };
  try { clock.offset = +localStorage.getItem("clockOffset") || 0; } catch (e) {}

  // Heure exacte, à utiliser partout à la place de new Date().
  const now = () => new Date(deviceNow() + clock.offset);

  function recordServerTime(res, sentAt, receivedAt) {
    const header = res.headers.get("Date");
    const server = header ? Date.parse(header) : NaN;
    if (isNaN(server)) return;
    // L'en-tête est à la seconde près : on vise le milieu de la seconde et du trajet aller-retour.
    const sample = server + 500 - (sentAt + receivedAt) / 2;
    clock.samples = [...clock.samples, sample].slice(-7);
    const sorted = [...clock.samples].sort((a, b) => a - b);
    clock.offset = Math.round(sorted[Math.floor(sorted.length / 2)]);  // médiane : ignore les mesures aberrantes
    try { localStorage.setItem("clockOffset", String(clock.offset)); } catch (e) {}
  }

  // ---------- Chargement des données (avec cache hors ligne) ----------

  async function fetchText(url) {
    const sep = url.includes("?") ? "&" : "?";
    const sentAt = deviceNow();
    const res = await fetch(`${url}${sep}t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    recordServerTime(res, sentAt, deviceNow());
    return res.text();
  }

  function saveCache(key, value) {
    try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), value })); } catch (e) {}
  }
  function readCache(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }

  // Colonnes obligatoires de chaque onglet. Google renvoie le 1er onglet quand un nom d'onglet
  // n'existe pas : cette vérification évite d'afficher, par exemple, les actus à la place des infos.
  const REQUIRED_COLUMNS = {
    actus: ["titre", "texte", "debut", "fin"],
    infos: ["icone", "titre", "detail"],
    config: ["cle", "valeur"],
  };

  // Export CSV d'un onglet, lisible par le navigateur. headers=1 : la 1re ligne est toujours l'en-tête.
  function tabUrl(name) {
    return SHEET_ID
      ? `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(name)}`
      : `data/${name}.csv`;
  }

  async function loadSheet(name) {
    const cacheKey = `sheet:${SHEET_ID || "demo"}:${name}`;
    try {
      const rows = csvToObjects(await fetchText(tabUrl(name)));
      const missing = REQUIRED_COLUMNS[name].filter((c) => !rows.columns.includes(c));
      if (missing.length) {
        const problem = `Onglet « ${name} » introuvable ou incomplet (colonnes manquantes : ${missing.join(", ")})`;
        const cached = readCache(cacheKey);
        return { rows: cached ? cached.value : [], fresh: false, problem };
      }
      saveCache(cacheKey, rows);
      return { rows, fresh: true };
    } catch (err) {
      console.warn("Lecture impossible, utilisation du cache :", err);
      const cached = readCache(cacheKey);
      return { rows: cached ? cached.value : [], fresh: false };
    }
  }

  // Réglage numérique de l'onglet config (virgule décimale acceptée), sinon valeur par défaut.
  function numSetting(key, fallback) {
    const v = parseFloat(String(state.settings[key] ?? "").replace(",", "."));
    return isNaN(v) ? fallback : v;
  }

  async function refreshData() {
    const [settings, actus, infos] = await Promise.all(
      ["config", "actus", "infos"].map(loadSheet));
    state.problem = [settings, actus, infos].map((r) => r.problem).filter(Boolean)[0] || "";

    state.settings = Object.fromEntries(
      settings.rows.map((r) => [normalizeKey(r.cle || ""), r.valeur || ""]));
    renderSettings();
    setNews(actus.rows);
    renderInfos(infos.rows);

    const ok = settings.fresh && actus.fresh && infos.fresh;
    state.offline = !ok && !state.problem;
    if (ok) state.lastSync = now();
    renderStatus();
  }

  // ---------- En-tête ----------

  // Thème graphique : ?style= dans l'adresse, sinon ligne « style » du classeur config, sinon config.js.
  // Le thème classique est toujours chargé ; un autre thème s'y superpose et ne redéfinit que ce qui change.
  // Un nom inconnu ramène au thème classique.
  function applyStyle() {
    const wanted = normalizeKey(forcedStyle || state.settings.style || C.style || "");
    const name = C.styles.includes(wanted) ? wanted : "classique";
    const link = $("theme-css");
    const href = name === "classique" ? null : `themes/${name}.css`;
    if (link.getAttribute("href") !== href) {
      if (href) link.setAttribute("href", href); else link.removeAttribute("href");
    }
    document.documentElement.dataset.style = name;
  }

  function renderSettings() {
    const s = state.settings;
    applyStyle();
    const name = s.nom_residence || "Résidence";
    // « La Fabrique - Bâtiment D » : chaque partie dans son span, pour que les thèmes puissent les distinguer.
    const [main, sub] = name.split(/\s+[-–—]\s+/, 2);
    $("residence-name").innerHTML = sub
      ? `<span class="brand-main">${escapeHtml(main)}</span><span class="brand-sep"> - </span><span class="brand-sub">${escapeHtml(sub)}</span>`
      : escapeHtml(name);
    $("residence-address").textContent = s.adresse || "";
    $("footer-note").textContent = s.message_pied || "";
    document.title = `${name} — Affichage`;
  }

  let lastMinute = -1;
  function tickClock() {
    const t = now();
    const z = zoned(t);
    if (z.minute === lastMinute) return;
    lastMinute = z.minute;
    $("clock-time").textContent = fmtTime.format(t);
    $("clock-date").textContent = fmtDate.format(t);

    const h = z.hour;
    const nightStart = numSetting("nuit_debut", C.nightStart);
    const nightEnd = numSetting("nuit_fin", C.nightEnd);
    const night = nightStart > nightEnd
      ? h >= nightStart || h < nightEnd
      : h >= nightStart && h < nightEnd;
    document.body.classList.toggle("night", forcedTheme ? forcedTheme === "nuit" : night);

    // Rechargement complet quotidien (libère la mémoire, récupère les mises à jour du site).
    if (h === C.reloadHour && Date.now() - startedAt > 2 * 60 * MIN) location.reload();

    // Léger décalage de l'écran toutes les 10 min pour limiter le marquage de la dalle.
    if (lastMinute % 10 === 0) {
      const dx = Math.round(Math.random() * 6 - 3), dy = Math.round(Math.random() * 6 - 3);
      $("screen").style.transform = `translate(${dx}px, ${dy}px)`;
    }
    renderStatus();
  }

  function renderStatus() {
    const el = $("status");
    if (state.problem) {
      // Sheet mal structuré : message explicite pour la personne qui installe (prend toute la largeur).
      el.innerHTML = `<span class="offline">${escapeHtml(state.problem)}</span>`;
      $("footer-note").textContent = "";
    } else if (state.offline) {
      const since = state.lastSync ? ` — infos du ${fmtShort.format(state.lastSync)} à ${fmtTime.format(state.lastSync)}` : "";
      el.innerHTML = `<span class="offline">Hors ligne</span>${escapeHtml(since)}`;
    } else if (state.lastSync) {
      el.textContent = `Mis à jour à ${fmtTime.format(state.lastSync)}`;
    }
  }

  // ---------- Météo (Open-Meteo, sans clé) ----------

  const WMO = [
    [[0], "Ensoleillé", "clear"],
    [[1], "Plutôt ensoleillé", "partly"],
    [[2], "Partiellement nuageux", "partly"],
    [[3], "Couvert", "cloudy"],
    [[45, 48], "Brouillard", "fog"],
    [[51, 53, 55, 56, 57], "Bruine", "drizzle"],
    [[61, 63, 66, 80, 81], "Pluie", "rain"],
    [[65, 67, 82], "Forte pluie", "rain"],
    [[71, 73, 75, 77, 85, 86], "Neige", "snow"],
    [[95, 96, 99], "Orage", "storm"],
  ];
  function describe(code, isDay = true) {
    const hit = WMO.find(([codes]) => codes.includes(code)) || [[], "—", "cloudy"];
    let icon = hit[2];
    if (!isDay && icon === "clear") icon = "clearNight";
    if (!isDay && icon === "partly") icon = "partlyNight";
    return { label: hit[1], icon: WEATHER_ICONS[icon] };
  }

  async function refreshWeather() {
    const url = "https://api.open-meteo.com/v1/forecast"
      + `?latitude=${numSetting("latitude", C.latitude)}&longitude=${numSetting("longitude", C.longitude)}`
      + "&current=temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m"
      + "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max"
      + "&timezone=Europe%2FParis&forecast_days=4";
    let data;
    try {
      data = JSON.parse(await fetchText(url));
      saveCache("weather", data);
    } catch (err) {
      console.warn("Météo indisponible :", err);
      const cached = readCache("weather");
      if (!cached || Date.now() - cached.at > 12 * 60 * MIN) return;
      data = cached.value;
    }
    renderWeather(data);
  }

  function renderWeather(d) {
    const cur = d.current;
    const now = describe(cur.weather_code, cur.is_day === 1);
    $("weather-icon").innerHTML = now.icon;
    $("weather-temp").textContent = `${Math.round(cur.temperature_2m)}°`;
    $("weather-desc").textContent = now.label;
    $("weather-extra").innerHTML =
      `<span>Ressenti ${Math.round(cur.apparent_temperature)}°</span><span>Vent ${Math.round(cur.wind_speed_10m)} km/h</span>`;

    const days = d.daily.time.map((t, i) => ({
      date: new Date(`${t}T12:00:00Z`),   // midi UTC : même jour dans le fuseau de l'immeuble
      code: d.daily.weather_code[i],
      max: Math.round(d.daily.temperature_2m_max[i]),
      min: Math.round(d.daily.temperature_2m_min[i]),
      rain: d.daily.precipitation_probability_max[i],
    }));
    // Aujourd'hui puis les 2 jours suivants.
    $("weather-days").innerHTML = days.slice(0, 3).map((day, i) => `
      <li class="weather-day">
        <div class="weather-day-name">${i === 0 ? "Auj." : escapeHtml(fmtDay.format(day.date).replace(".", ""))}</div>
        <div class="weather-day-icon">${describe(day.code).icon}</div>
        <div class="weather-day-temp">${day.max}° <span class="min">${day.min}°</span></div>
        <div class="weather-day-rain">${day.rain != null ? `<span class="weather-day-min">min ${day.min}°</span><span class="weather-day-rain-label">Pluie </span>${day.rain}\u00a0%` : ""}</div>
      </li>`).join("");
  }

  // ---------- Actualités ----------

  const isImportant = (n) => normalizeKey(n.categorie || "") === "important";

  function setNews(rows) {
    const today = zoned(now()).day;
    const news = rows.filter((r) => {
      if (!r.titre || isNo(r.actif)) return false;
      const start = parseDate(r.debut), end = parseDate(r.fin);
      if (start && zoned(start).day > today) return false;
      if (end && zoned(end).day < today) return false;
      return true;
    });
    // Les actus importantes passent en tête (l'ordre du Sheet est conservé à l'intérieur de chaque groupe).
    news.sort((a, b) => isImportant(b) - isImportant(a));

    const key = JSON.stringify(news);
    if (key === state.newsKey) return;      // rien n'a changé : on ne perturbe pas le défilement
    state.newsKey = key;
    state.news = news;
    renderNews();
  }

  function renderNews() {
    const stage = $("news-stage");
    clearTimeout(state.slideTimer);

    if (!state.news.length) {
      stage.innerHTML = `<div class="slide card news-empty active">Aucune actualité pour le moment.</div>`;
      $("news-counter").textContent = "";
      $("news-progress-bar").style.width = "0";
      $("news-steps").innerHTML = "";
      return;
    }

    $("news-steps").innerHTML = state.news.length > 1 ? state.news.map(() => "<span></span>").join("") : "";

    stage.innerHTML = state.news.map((n) => {
      const img = imageUrl(n.image);
      const start = parseDate(n.debut);
      const important = isImportant(n);
      const meta = [
        n.categorie
          ? `<span class="slide-tag">${escapeHtml(n.categorie)}</span>`
          : "",
        start ? `<span>${escapeHtml(fmtShort.format(start))}</span>` : "",
      ].join("");
      return `
        <article class="slide card ${img ? "" : "no-image"} ${important ? "important" : ""}">
          ${img ? `<div class="slide-image" style="background-image:url('${encodeURI(img)}')"></div>` : ""}
          <div class="slide-body">
            ${meta ? `<div class="slide-meta">${meta}</div>` : ""}
            <h2 class="slide-title">${escapeHtml(n.titre)}</h2>
            ${n.texte ? `<p class="slide-text">${escapeHtml(n.texte)}</p>` : ""}
          </div>
        </article>`;
    }).join("");

    document.fonts.ready.then(() => [...stage.children].forEach(fitSlide));
    state.slideIndex = Math.min(state.slideIndex, state.news.length - 1);
    showSlide(state.slideIndex);
  }

  // Réduit progressivement le texte d'une actu trop longue pour qu'elle tienne entière.
  function fitSlide(slide) {
    const body = slide.querySelector(".slide-body");
    const parts = [...slide.querySelectorAll(".slide-title, .slide-text")];
    const base = parts.map((el) => parseFloat(getComputedStyle(el).fontSize));
    for (let scale = 1; scale > 0.55 && body.scrollHeight > body.clientHeight + 1; scale -= 0.05) {
      parts.forEach((el, i) => { el.style.fontSize = `${base[i] * scale}px`; });
    }
  }

  function showSlide(i) {
    const slides = $("news-stage").children;
    [...slides].forEach((s, j) => s.classList.toggle("active", j === i));
    $("news-counter").textContent = state.news.length > 1 ? `${i + 1} / ${state.news.length}` : "";

    const seconds = +(state.news[i].duree || state.settings.duree_actu) || C.defaultSlideSeconds;

    // Segments (thèmes qui les affichent) : ceux déjà vus sont pleins, celui en cours se remplit.
    const steps = $("news-steps");
    steps.style.setProperty("--slide-duration", `${seconds}s`);
    [...steps.children].forEach((s, j) => {
      s.classList.toggle("done", j < i);
      s.classList.toggle("active", j === i);
    });
    const bar = $("news-progress-bar");
    bar.style.transition = "none";
    bar.style.width = "0";
    if (state.news.length < 2) return;

    void bar.offsetWidth; // relance l'animation
    bar.style.transition = `width ${seconds}s linear`;
    bar.style.width = "100%";

    state.slideTimer = setTimeout(() => {
      state.slideIndex = (i + 1) % state.news.length;
      showSlide(state.slideIndex);
    }, seconds * 1000);
  }

  // ---------- Infos pratiques ----------

  function renderInfos(rows) {
    $("infos-grid").innerHTML = rows
      .filter((r) => r.titre || r.detail)
      .map((r) => {
        const icon = INFO_ICONS[normalizeKey(r.icone || "")] || INFO_ICONS.info;
        return `
          <li class="info card ${isYes(r.pleine_largeur) ? "wide" : ""}">
            <div class="info-icon">${icon}</div>
            <div class="info-text">
              <div class="info-title">${escapeHtml(r.titre)}</div>
              <div class="info-detail">${escapeHtml(r.detail)}</div>
            </div>
          </li>`;
      }).join("");
  }

  // ---------- Démarrage ----------

  applyStyle();
  tickClock();
  setInterval(tickClock, 1000);
  // La météo attend le 1er chargement du Sheet, qui peut préciser la position de l'immeuble.
  refreshData().finally(refreshWeather);
  setInterval(refreshData, C.refreshDataMinutes * MIN);
  setInterval(refreshWeather, C.refreshWeatherMinutes * MIN);

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
