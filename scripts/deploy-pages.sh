#!/usr/bin/env bash
# Build the app and deploy it to Cloudflare Pages (https://perfectm0tch.pages.dev).
# The OpenNext Worker is bundled into a single module and shipped as Pages'
# advanced-mode `_worker.js/index.js`, alongside the static assets.
set -euo pipefail
cd "$(dirname "$0")/.."

npx opennextjs-cloudflare build
rm -rf .pages-bundle .pages-dist
npx wrangler deploy --dry-run --outdir .pages-bundle
mkdir -p .pages-dist/_worker.js
cp -r .open-next/assets/. .pages-dist/
cp .pages-bundle/worker.js .pages-dist/_worker.js/index.js
# serve static files straight from the CDN without invoking the worker
cat > .pages-dist/_routes.json <<'JSON'
{ "version": 1, "include": ["/*"], "exclude": ["/_next/static/*", "/data/*", "/mediapipe/*", "/models/*", "/favicon.ico"] }
JSON
# the same security headers for static files Pages serves directly
node -e 'import("./security-headers.mjs").then(({ SECURITY_HEADERS: h }) => require("node:fs").writeFileSync(".pages-dist/_headers", ["/*", ...h.map((x) => `  ${x.key}: ${x.value}`)].join("\n") + "\n"))'
npx wrangler pages deploy .pages-dist --project-name perfectm0tch --branch main --commit-dirty=true
