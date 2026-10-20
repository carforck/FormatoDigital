# FormatoDigital · Demo SOTEC

Prototipo comercial: landing + aplicativo que digitaliza los formatos del SG-SST de SOTEC
(FO-GSST-22 Reporte técnico y F-GSST-13 Permiso de trabajo). Replica el enfoque de
GenCuentasCobroAlzak: asistente conversacional por pasos, vista previa en vivo editable,
firmas, roles y flujo de aprobación.

Demo publicada: https://carforck.github.io/FormatoDigital/

```bash
npm install
npm run dev   # http://localhost:3100
```

Publicar en GitHub Pages: `npm run deploy` (compila con `GITHUB_PAGES=true`, exporta
el sitio estático bajo `/FormatoDigital` y lo sube a la rama `gh-pages`).

- `/` landing comercial · `/acceso` entrar por rol sin credenciales · `/app` aplicativo
- Roles: Técnico de campo, Coordinador SST, Administrador, Cliente (cambio en vivo con «Ver como»)
- Flujo: borrador → en revisión → aprobado → cerrado (rechazado vuelve al autor con motivo)
- Datos ficticios en `localStorage` (`src/lib/seed.ts`); se restablecen en Configuración.
- Animación del inicio: `python3 scripts/generar-lottie.py` regenera `public/lottie/digitaliza.json`.
- Sin backend: para producción, reemplazar `src/lib/store.tsx` por Supabase como en el proyecto original.
