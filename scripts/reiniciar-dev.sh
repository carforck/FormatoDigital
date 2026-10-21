#!/usr/bin/env bash
# Reinicia el servidor de desarrollo en el puerto 3100 con la caché limpia.
# Útil si la página carga sin estilos o con "Cannot find module" tras muchos cambios.
set -uo pipefail
cd "$(dirname "$0")/.."
PUERTO=3100
for pid in $(ss -ltnp 2>/dev/null | grep ":$PUERTO " | grep -o 'pid=[0-9]*' | cut -d= -f2 | sort -u); do
  padre=$(ps -o ppid= -p "$pid" | tr -d ' ')
  kill "$pid" 2>/dev/null
  [ -n "$padre" ] && [ "$padre" != "1" ] && kill "$padre" 2>/dev/null
done
for _ in $(seq 1 20); do ss -ltn | grep -q ":$PUERTO " || break; sleep 0.5; done
if ss -ltn | grep -q ":$PUERTO "; then echo "El puerto $PUERTO sigue ocupado"; exit 1; fi
rm -rf .next
nohup npm run dev > "${TMPDIR:-/tmp}/formatodigital-dev.log" 2>&1 &
for _ in $(seq 1 60); do
  [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 http://localhost:$PUERTO/)" = 200 ] && { echo "Listo: http://localhost:$PUERTO"; exit 0; }
  sleep 1
done
echo "El servidor no respondió; revisa ${TMPDIR:-/tmp}/formatodigital-dev.log"; exit 1
