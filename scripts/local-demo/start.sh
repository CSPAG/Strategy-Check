#!/usr/bin/env bash
# Lokale Vorschau ohne Postgres und ohne Keycloak: SQLite-Datei + Demo-Modus + Beispieldaten.
# Ändert prisma/schema.prisma NICHT. Vor einem Deploy/Build: `npx prisma generate` (macht der Vercel-Build ohnehin).
set -euo pipefail
cd "$(dirname "$0")/../.."
DIR="node_modules/.local-preview"
DB="$PWD/$DIR/dev.db"
mkdir -p "$DIR"
sed 's/provider = "postgresql"/provider = "sqlite"/' prisma/schema.prisma > "$DIR/schema.prisma"
export DATABASE_URL="file:$DB"

if [ "${1:-}" = "--reset" ] || [ ! -f "$DB" ]; then
  rm -f "$DB"
  npx prisma generate --schema "$DIR/schema.prisma" >/dev/null
  npx prisma db push --schema "$DIR/schema.prisma" --skip-generate >/dev/null
  npx tsx prisma/seed.ts
  npx tsx scripts/local-demo/demo-data.ts
  echo "Beispieldaten geladen."
else
  npx prisma generate --schema "$DIR/schema.prisma" >/dev/null
  # Neue Tabellen/Felder übernehmen (nur additive Änderungen, Daten bleiben).
  npx prisma db push --schema "$DIR/schema.prisma" --skip-generate >/dev/null
fi

cat > .env.local <<ENV
DEMO_MODE=true
DATABASE_URL="file:$DB"
AUTH_SECRET=local-preview-only
AUTH_URL=http://localhost:3123
AUTH_TRUST_HOST=true
ENV

exec npx next dev -p 3123
