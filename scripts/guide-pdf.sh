#!/usr/bin/env bash
# Génère GUIDE-CONSEIL.pdf à partir de GUIDE-CONSEIL.md (mise en page : scripts/guide-modele.html).
# Lancé automatiquement par GitHub (.github/workflows/guide-pdf.yml) ; utilisable aussi en local.
# Nécessite Node.js et Google Chrome (ou Chromium).
set -euo pipefail
cd "$(dirname "$0")/.."

CHROME="${CHROME:-}"
if [ -z "$CHROME" ]; then
  for c in google-chrome chromium chromium-browser "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; do
    if command -v "$c" >/dev/null 2>&1 || [ -x "$c" ]; then CHROME="$c"; break; fi
  done
fi
[ -n "$CHROME" ] || { echo "Chrome introuvable (variable CHROME)" >&2; exit 1; }

html="scripts/.guide.html"
trap 'rm -f "$html"' EXIT

contenu="$(npx --yes marked@15.0.12 -i GUIDE-CONSEIL.md)"
{
  sed '/{{CONTENU}}/,$d' scripts/guide-modele.html
  printf '%s\n' "$contenu"
  sed '1,/{{CONTENU}}/d' scripts/guide-modele.html
} > "$html"

# CHROME_FLAGS permet d'ajouter --no-sandbox sur les serveurs GitHub.
"$CHROME" --headless=new --disable-gpu ${CHROME_FLAGS:-} --no-pdf-header-footer \
  --print-to-pdf="$PWD/GUIDE-CONSEIL.pdf" "file://$PWD/$html" 2>/dev/null

echo "GUIDE-CONSEIL.pdf généré"
