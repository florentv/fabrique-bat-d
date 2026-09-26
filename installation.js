// Page d'installation : vérifie le Google Sheet d'un immeuble et fournit l'adresse de sa tablette.
(function () {
  "use strict";

  const C = window.CONFIG;
  const $ = (id) => document.getElementById(id);

  // Mêmes règles que l'affichage (app.js).
  const REQUIRED_COLUMNS = {
    actus: ["titre", "texte", "debut", "fin"],
    infos: ["icone", "titre", "detail"],
    config: ["cle", "valeur"],
  };

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function normalizeKey(s) {
    return String(s).trim().toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  }

  function sheetIdFrom(value) {
    const v = String(value || "").trim();
    const m = v.match(/spreadsheets\/d\/([\w-]{20,})/);
    if (m) return m[1];
    return /^[\w-]{20,}$/.test(v) ? v : "";
  }

  // Colonnes de la 1re ligne d'un CSV (valeurs entre guillemets, séparées par des virgules).
  function csvHeader(text) {
    const line = text.replace(/^﻿/, "").split(/\r?\n/)[0] || "";
    return (line.match(/"([^"]*)"|[^,]+/g) || []).map((c) => normalizeKey(c.replace(/^"|"$/g, "")));
  }

  async function checkTab(id, name) {
    const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&headers=1`
      + `&sheet=${encodeURIComponent(name)}&t=${Date.now()}`;
    let text;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(res.status);
      text = await res.text();
    } catch (e) {
      return { ok: false, detail: "illisible : le Google Sheet est-il partagé en « Tous les utilisateurs disposant du lien » ?" };
    }
    const columns = csvHeader(text);
    const missing = REQUIRED_COLUMNS[name].filter((c) => !columns.includes(c));
    if (missing.length) {
      return { ok: false, detail: `onglet introuvable ou incomplet, colonnes manquantes : ${missing.join(", ")}` };
    }
    return { ok: true, detail: "colonnes correctes" };
  }

  // Adresse de l'affichage sur ce site (le fork de l'immeuble), avec son Sheet.
  function tabletUrl(id) {
    const base = new URL("./", location.href);
    return `${base.href}?sheet=${id}`;
  }

  function renderChecks(items) {
    $("checks").innerHTML = items.map((it) => `
      <li class="${it.ok === undefined ? "" : it.ok ? "ok" : "ko"}">
        <span class="mark">${it.ok === undefined ? "…" : it.ok ? "✓" : "✗"}</span>
        <span><strong>${escapeHtml(it.label)}</strong> <span class="detail">${escapeHtml(it.detail || "")}</span></span>
      </li>`).join("");
  }

  async function check(event) {
    event.preventDefault();
    const id = sheetIdFrom($("sheet-input").value);
    $("result-section").hidden = true;
    if (!id) {
      renderChecks([{ ok: false, label: "Lien", detail: "ce n'est pas un lien de Google Sheet (il doit contenir /spreadsheets/d/…)" }]);
      return;
    }

    const tabs = Object.keys(REQUIRED_COLUMNS);
    renderChecks(tabs.map((t) => ({ label: `Onglet ${t}`, detail: "vérification…" })));
    $("check-btn").disabled = true;
    const results = await Promise.all(tabs.map((t) => checkTab(id, t)));
    $("check-btn").disabled = false;
    renderChecks(results.map((r, i) => ({ ...r, label: `Onglet ${tabs[i]}` })));

    if (results.every((r) => r.ok)) showResult(id);
  }

  function showResult(id) {
    const url = tabletUrl(id);
    $("tablet-url").textContent = url;
    const qr = qrcode(0, "M");
    qr.addData(url);
    qr.make();
    $("qr").innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    $("preview").src = url;
    $("result-section").hidden = false;
    $("result-section").scrollIntoView({ behavior: "smooth", block: "start" });

    $("copy-btn").onclick = async () => {
      try {
        await navigator.clipboard.writeText(url);
        $("copy-btn").textContent = "Adresse copiée ✓";
      } catch (e) {
        getSelection().selectAllChildren($("tablet-url"));
        $("copy-btn").textContent = "Adresse sélectionnée : Ctrl/Cmd + C";
      }
    };
    $("open-btn").onclick = () => window.open(url, "_blank", "noopener");
  }

  // Lien de copie du Sheet modèle, s'il est configuré.
  const templateId = sheetIdFrom(C.sheetModele);
  if (templateId) {
    $("template-link").href = `https://docs.google.com/spreadsheets/d/${templateId}/copy`;
    $("template-ok").hidden = false;
    $("template-none").hidden = true;
  }

  $("form").addEventListener("submit", check);

  // …/installation.html?sheet=<lien> : pré-remplit et lance la vérification.
  const preset = new URLSearchParams(location.search).get("sheet");
  if (preset) {
    $("sheet-input").value = preset;
    $("form").requestSubmit();
  }
})();
