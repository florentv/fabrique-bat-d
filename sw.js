// Garde une copie du site pour qu'il redémarre même sans réseau.
// Stratégie « réseau d'abord » : les mises à jour du site sont prises en compte immédiatement.
const CACHE = "affichage-v3";
const SHELL = [
  "./", "index.html", "style.css", "themes/classique.css", "config.js", "icons.js", "app.js",
  "fonts/atkinson-400.woff2", "fonts/atkinson-700.woff2", "fonts/fraunces.woff2",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Seuls les fichiers du site passent par ici ; le Sheet et la météo ont leur propre cache.
  if (e.request.method !== "GET" || url.origin !== location.origin) return;

  // cache: "no-cache" : on redemande toujours au serveur si le fichier a changé,
  // sans attendre l'expiration du cache navigateur (10 min sur GitHub Pages).
  e.respondWith(
    fetch(e.request, { cache: "no-cache" })
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })));
});
