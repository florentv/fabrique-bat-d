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

  const state = {
    settings: {},
    news: [],
    newsKey: "",
    slideIndex: Math.max(0, (+params.get("slide") || 1) - 1),
    slideTimer: null,
    lastSync: null,
    offline: false,
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
    return rows
      .filter((r) => r.some((v) => v.trim() !== ""))
      .map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
  }

  // Accepte JJ/MM/AAAA, JJ/MM/AA et AAAA-MM-JJ.
  function parseDate(s) {
    if (!s) return null;
    let m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
    if (m) {
      const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
      return new Date(y, +m[2] - 1, +m[1]);
    }
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    return null;
  }

  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

  const isYes = (v) => /^(oui|o|yes|y|x|1|vrai|true)$/i.test(String(v).trim());
  const isNo = (v) => /^(non|n|no|0|faux|false)$/i.test(String(v).trim());

  // Transforme un lien de partage Google Drive en lien d'image affichable.
  function imageUrl(url) {
    if (!url) return "";
    const m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?.*id=)([\w-]{10,})/);
    return m ? `https://lh3.googleusercontent.com/d/${m[1]}=w1600` : url;
  }

  const fmtTime = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const fmtDate = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const fmtShort = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });
  const fmtDay = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });

  // ---------- Chargement des données (avec cache hors ligne) ----------

  async function fetchText(url) {
    const sep = url.includes("?") ? "&" : "?";
    const res = await fetch(`${url}${sep}t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return res.text();
  }

  function saveCache(key, value) {
    try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), value })); } catch (e) {}
  }
  function readCache(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }

  // Un lien de partage Google Sheets (…/d/<id>/edit) est converti en export CSV lisible par le navigateur.
  // headers=1 : la 1re ligne est toujours l'en-tête (sinon Google la devine, parfois mal).
  function sheetCsvUrl(url) {
    const m = url.match(/docs\.google\.com\/spreadsheets\/d\/([\w-]{20,})/);
    return m ? `https://docs.google.com/spreadsheets/d/${m[1]}/gviz/tq?tqx=out:csv&headers=1` : url;
  }

  async function loadSheet(name) {
    const url = C.sheets[name] ? sheetCsvUrl(C.sheets[name]) : `data/${name}.csv`;
    try {
      const rows = csvToObjects(await fetchText(url));
      if (!rows.length) throw new Error(`onglet ${name} vide`);
      saveCache(`sheet:${name}`, rows);
      return { rows, fresh: true };
    } catch (err) {
      console.warn("Lecture impossible, utilisation du cache :", err);
      const cached = readCache(`sheet:${name}`);
      return { rows: cached ? cached.value : [], fresh: false };
    }
  }

  async function refreshData() {
    const [settings, actus, infos] = await Promise.all(
      ["config", "actus", "infos"].map(loadSheet));

    state.settings = Object.fromEntries(
      settings.rows.map((r) => [normalizeKey(r.cle || ""), r.valeur || ""]));
    renderSettings();
    setNews(actus.rows);
    renderInfos(infos.rows);

    const ok = settings.fresh && actus.fresh && infos.fresh;
    state.offline = !ok;
    if (ok) state.lastSync = new Date();
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
    const now = new Date();
    if (now.getMinutes() === lastMinute) return;
    lastMinute = now.getMinutes();
    $("clock-time").textContent = fmtTime.format(now);
    $("clock-date").textContent = fmtDate.format(now);

    const h = now.getHours();
    const night = C.nightStart > C.nightEnd
      ? h >= C.nightStart || h < C.nightEnd
      : h >= C.nightStart && h < C.nightEnd;
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
    if (state.offline) {
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
      + `?latitude=${C.latitude}&longitude=${C.longitude}`
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
      date: new Date(`${t}T12:00:00`),
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
        <div class="weather-day-rain">${day.rain != null ? `<span class="weather-day-min">min ${day.min}° · </span><span class="weather-day-rain-label">Pluie </span>${day.rain} %` : ""}</div>
      </li>`).join("");
  }

  // ---------- Actualités ----------

  const isImportant = (n) => normalizeKey(n.categorie || "") === "important";

  function setNews(rows) {
    const today = startOfDay(new Date());
    const news = rows.filter((r) => {
      if (!r.titre || isNo(r.actif)) return false;
      const start = parseDate(r.debut), end = parseDate(r.fin);
      if (start && start > today) return false;
      if (end && end < today) return false;
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
  refreshData();
  refreshWeather();
  setInterval(refreshData, C.refreshDataMinutes * MIN);
  setInterval(refreshWeather, C.refreshWeatherMinutes * MIN);

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
