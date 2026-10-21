#!/usr/bin/env bash
# Une las migraciones y la semilla en supabase/instalar.sql, listo para pegar
# en Supabase → SQL Editor → Run (proyecto nuevo, una sola vez).
set -euo pipefail
cd "$(dirname "$0")/.."
SALIDA=supabase/instalar.sql
{
  echo "-- FormatoDigital · instalador generado por scripts/armar-instalador.sh"
  echo "-- Pegar completo en Supabase → SQL Editor → Run. No editar a mano."
  for f in supabase/migrations/*.sql supabase/seed.sql; do
    echo; echo "-- ======================== $f"; cat "$f"
  done
} > "$SALIDA"
echo "Listo: $SALIDA ($(wc -l < "$SALIDA") líneas)"
