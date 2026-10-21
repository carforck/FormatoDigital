# FormatoDigital · Demo SOTEC

Plataforma que digitaliza los formatos de calidad y SG-SST. SOTEC es el cliente piloto:
FO-GSST-22 Reporte técnico (con registro fotográfico), F-GSST-13 Permiso de trabajo,
FO-GSST-25 Legalización de gastos y cuentas de cobro. Asistente conversacional por pasos,
vista previa en vivo editable, firmas, roles y flujo de aprobación.

Arquitectura, módulos, base de datos y pendientes: [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).

## Publicación

- **Vercel:** se despliega solo desde la rama `main` de GitHub `carforck/FormatoDigital`.
- **GitHub Pages (demo):** https://carforck.github.io/FormatoDigital/ con `npm run deploy`
  (compila con `GITHUB_PAGES=true`, exporta bajo `/FormatoDigital` en `.next-pages/` y lo sube
  a la rama `gh-pages`; puede correr aunque `npm run dev` esté encendido).

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

## Rutas

- `/` landing · `/acceso` entrar por rol sin credenciales · `/app` aplicativo
- `/app/nuevo/reporte`, `/app/nuevo/permiso`, `/app/nuevo/gasto` · `/app/cobros` cuentas de cobro
- `/firmar?t=<token>` firma remota del cliente por enlace (sin cuenta)

## Demo

- Roles: Técnico de campo, Coordinador SST, Administrador, Cliente (cambio en vivo con «Ver como»).
- Flujo: borrador → en revisión → aprobado → cerrado (rechazado vuelve al autor con motivo).
- Datos ficticios en `localStorage` (`src/nucleo/datos/`); se restablecen en Configuración.
  Al conectar Supabase se reemplaza ese proveedor de datos.
