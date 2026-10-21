#!/usr/bin/env python3
"""Aplica uno o más archivos SQL al proyecto Supabase (en una transacción) con la
Management API. Lee SUPABASE_ACCESS_TOKEN y SUPABASE_PROJECT_REF de .env.local.

  python3 scripts/aplicar-migracion.py supabase/migrations/0006_endurecer_funciones.sql
"""
import json, os, sys, urllib.request
from pathlib import Path

raiz = Path(__file__).resolve().parent.parent
for linea in (raiz / ".env.local").read_text().splitlines():
    if "=" in linea and not linea.startswith("#"):
        k, v = linea.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())

sql = "\n".join(Path(a).read_text() for a in sys.argv[1:])
req = urllib.request.Request(
    f"https://api.supabase.com/v1/projects/{os.environ['SUPABASE_PROJECT_REF']}/database/query",
    data=json.dumps({"query": f"begin;\n{sql}\ncommit;"}).encode(),
    method="POST",
    headers={"Authorization": f"Bearer {os.environ['SUPABASE_ACCESS_TOKEN']}", "Content-Type": "application/json", "User-Agent": "formatodigital"},
)
try:
    with urllib.request.urlopen(req, timeout=120) as r:
        print("Aplicado:", ", ".join(sys.argv[1:]))
except urllib.error.HTTPError as e:
    print("ERROR", e.code, e.read().decode()[:2000])
    sys.exit(1)
