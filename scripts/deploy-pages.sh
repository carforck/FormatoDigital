#!/usr/bin/env bash
# Compila el sitio estático y lo publica en la rama gh-pages (GitHub Pages).
# Uso: npm run deploy
set -euo pipefail
cd "$(dirname "$0")/.."
REMOTO=$(git remote get-url origin)
rm -rf out
GITHUB_PAGES=true npx next build
touch out/.nojekyll
TMP=$(mktemp -d)
cp -r out/. "$TMP"
cd "$TMP"
git init -q -b gh-pages
git add -A
git commit -q -m "deploy: $(date '+%Y-%m-%d %H:%M')"
git push -f "$REMOTO" gh-pages
rm -rf "$TMP"
echo "Publicado en https://carforck.github.io/FormatoDigital/"
