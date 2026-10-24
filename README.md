# ControlOne by SOTEC

**Toda tu empresa, un solo control.** ControlOne (antes FormatoDigital) es la plataforma de SOTEC
para el control digital de todas las áreas de una empresa: formatos, reportes, aprobaciones, firmas,
proyectos, equipos y facturación. Se publica en https://controlone.sotecse.com. Primeros formatos
digitalizados (calidad y SG-SST):
FO-GSST-22 Reporte técnico (con registro fotográfico), F-GSST-13 Permiso de trabajo,
FO-GSST-25 Legalización de gastos y cuentas de cobro. Asistente conversacional por pasos,
vista previa en vivo editable, firmas, roles y flujo de aprobación.

Arquitectura, módulos, base de datos y pendientes: [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).

## Publicación

- **Vercel:** https://formato-digital-nine.vercel.app — se despliega solo con cada push a `main`
  de GitHub `carforck/FormatoDigital`. Es el único despliegue (GitHub Pages ya no se usa).

## Desarrollo

```bash
npm install
npm run dev                      # http://localhost:3100
bash scripts/reiniciar-dev.sh    # reinicia el dev con la caché limpia
```

| Comando | Qué hace |
|---|---|
| `npm run test:db` | Migraciones y RLS en un PostgreSQL desechable (`scripts/probar-db.sh`) |
| `npm run test:unit` | Valor en letras de las cuentas de cobro |
| `npm run test:e2e` | Demo en el navegador; `SOLO=flujo\|responsive\|controles\|magno`, `BASE=<url>` para el sitio publicado |
| `python3 scripts/aplicar-migracion.py <archivo.sql>` | Aplica SQL a Supabase (lee `.env.local`, que no se sube) |
| `bash scripts/armar-instalador.sh` | Regenera `supabase/instalar.sql` |
| `python3 scripts/generar-lottie.py` | Regenera la animación `public/lottie/digitaliza.json` |
| `python3 scripts/generar-mapa-db.py` | Regenera el esquema del «Mapa del sistema» (`src/components/mapa/esquema.json`) desde `supabase/migrations/`; `--check` falla si está desactualizado |

## Rutas

- `/` landing · `/acceso` entrar por rol sin credenciales · `/app` aplicativo
- `/app/nuevo/reporte`, `/app/nuevo/permiso`, `/app/nuevo/gasto` · `/app/cobros` cuentas de cobro
- `/firmar?t=<token>` firma remota del cliente por enlace (sin cuenta)

## Demo

- Roles: Técnico de campo, Coordinador SST, Administrador, Cliente (cambio en vivo con «Ver como»).
- Flujo: borrador → en revisión → aprobado → cerrado (rechazado vuelve al autor con motivo).
- Datos ficticios en `localStorage` (`src/nucleo/datos/`); se restablecen en Configuración.
  Al conectar Supabase se reemplaza ese proveedor de datos.
