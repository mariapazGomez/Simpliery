#!/usr/bin/env bash
# Bundle a Vite + React + Tailwind project into a single self-contained HTML file.
# Run from inside the project directory: bash ../scripts/bundle-artifact.sh
# Output: bundle.html

set -euo pipefail

echo "📦 Bundling artifact to bundle.html..."

# ── 1. Verify we are inside a project directory ───────────────────────────
if [ ! -f "index.html" ]; then
  echo "❌ No index.html found. Run this script from inside your project directory."
  exit 1
fi

if [ ! -f "package.json" ]; then
  echo "❌ No package.json found. Run this script from inside your project directory."
  exit 1
fi

# ── 2. Install bundling dependencies ──────────────────────────────────────
echo "⬇️  Installing bundling dependencies..."
npm install -D \
  parcel \
  @parcel/config-default \
  @parcel/transformer-typescript-tsc \
  parcel-resolver-tspaths \
  html-inline

# ── 3. Write .parcelrc with path alias support ────────────────────────────
cat > .parcelrc << 'EOF'
{
  "extends": "@parcel/config-default",
  "resolvers": ["parcel-resolver-tspaths", "..."]
}
EOF

# ── 4. Ensure index.html references src/main.tsx ─────────────────────────
# Parcel needs a proper entry point. If the existing index.html uses a module
# script pointing to /src/main.tsx, we're good. Otherwise patch it.
if ! grep -q "src/main.tsx\|src/main.ts\|src/main.jsx\|src/main.js" index.html; then
  echo "⚠️  Patching index.html to reference src/main.tsx..."
  # Insert script tag before </body>
  sed -i 's|</body>|  <script type="module" src="src/main.tsx"></script>\n</body>|' index.html
fi

# ── 5. Build with Parcel ──────────────────────────────────────────────────
echo "🔨 Building with Parcel (no source maps)..."
npx parcel build index.html \
  --no-source-maps \
  --dist-dir dist-parcel \
  --no-optimize 2>/dev/null || \
npx parcel build index.html \
  --no-source-maps \
  --dist-dir dist-parcel

# ── 6. Inline all assets into single HTML ────────────────────────────────
echo "🔗 Inlining assets into bundle.html..."
DIST_HTML=$(find dist-parcel -name "*.html" | head -1)

if [ -z "$DIST_HTML" ]; then
  echo "❌ Parcel build did not produce an HTML file in dist-parcel/"
  exit 1
fi

npx html-inline -i "$DIST_HTML" -o bundle.html

# ── 7. Report output size ─────────────────────────────────────────────────
SIZE=$(du -sh bundle.html | cut -f1)
echo ""
echo "✅ Done! bundle.html created ($SIZE)"
echo ""
echo "Share bundle.html in your Claude conversation to display the artifact."
