# ControlOne by SOTEC

**Toda tu empresa, un solo control.** ControlOne (antes FormatoDigital) es la plataforma de SOTEC
para el control digital de una empresa de servicios técnicos: formatos del sistema de gestión
(calidad y SG-SST), reportes, aprobaciones, firmas, proyectos, equipos, cotizaciones y cuentas de
cobro. Cada formato se diligencia con un asistente conversacional por pasos o con el formulario,
con vista previa en vivo editable, firmas en el celular, flujo de aprobación por roles y PDF fiel al
formato aprobado.

- Producción: **https://controlone.sotecse.com** (landing en `/`, aplicativo en `/app`).
- Repositorio: GitHub `carforck/FormatoDigital` (rama `main` → Vercel).
- Diseño detallado (reglas de cada módulo, impresión, seguridad, pedidos de SOTEC):
  [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).

Primeros formatos digitalizados: **FO-GSST-22** Reporte técnico (con registro fotográfico),
**F-GSST-13** Permiso de trabajo, **FO-GSST-25** Legalización de gastos, Cotización y Cuenta de
cobro.

---

## Contenido

1. [Stack](#stack)
2. [Correr en local](#correr-en-local)
3. [Los dos modos: demo y empresa](#los-dos-modos-demo-y-empresa)
4. [Estructura de carpetas](#estructura-de-carpetas)
5. [Rutas](#rutas)
6. [Módulos](#módulos)
7. [Roles y permisos](#roles-y-permisos)
8. [Backend: Supabase](#backend-supabase)
9. [API `/api/usuarios`](#api-apiusuarios)
10. [App instalable y sin conexión (PWA)](#app-instalable-y-sin-conexión-pwa)
11. [Despliegue](#despliegue)
12. [Scripts](#scripts)
13. [Pruebas](#pruebas)
14. [Pendientes y hoja de ruta](#pendientes-y-hoja-de-ruta)

---

## Stack

| Capa | Tecnología |
|---|---|
| Aplicación | Next.js 14 (App Router) + React 18 + TypeScript |
| Estilos | Tailwind CSS 3 (+ `tailwindcss-animate`), íconos `lucide-react`, componentes base estilo shadcn (`src/components/ui/`) |
| Datos y login | Supabase (PostgreSQL + Auth + RLS) con `@supabase/supabase-js` |
| Mapa del sistema | `@xyflow/react` + `@dagrejs/dagre` |
| Animaciones | `lottie-react` (archivos en `public/lottie/`, generados por scripts) |
| Hosting | Vercel (despliegue automático desde `main`) |
| Pruebas | `tsx` (unitarias), `puppeteer-core` + Chrome (e2e), PostgreSQL desechable (base de datos) |

---

## Correr en local

Requisitos: Node 20+ y npm. Para las pruebas e2e, Google Chrome; para `test:db`, Podman o Docker.

```bash
npm install
cp .env.example .env.local     # opcional: solo para el modo empresa
npm run dev                    # http://localhost:3100
```

- **Sin variables de entorno** la app funciona completa en **modo demo** (datos ficticios en el
  navegador). Es lo más rápido para desarrollar.
- **Con Supabase**, completa `.env.local` (nunca se sube al repositorio):

| Variable | Dónde se usa | Pública |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Navegador y servidor | Sí |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Navegador (la protege RLS) | Sí |
| `SUPABASE_SECRET_KEY` | Solo servidor: `/api/usuarios` (`src/servidor/supabase-admin.ts`) | **No** |
| `NEXT_PUBLIC_SITE_URL` | Metadatos / Open Graph (`src/app/layout.tsx`); opcional, por defecto la URL de producción | Sí |
| `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` | Solo `scripts/aplicar-migracion.py` | **No** |
| `RESEND_API_KEY` | Reservada para el correo con Resend (aún no se usa) | **No** |

Otros comandos útiles:

```bash
bash scripts/reiniciar-dev.sh   # reinicia el dev con la caché limpia (página sin estilos o "Cannot find module")
npm run build && npm start      # compilación de producción en el puerto 3100
npm run lint                    # ESLint (next lint)
```

---

## Los dos modos: demo y empresa

Toda la app lee y escribe sus datos a través de **un solo proveedor**,
`src/nucleo/datos/DemoProvider.tsx` (hook `useDemo()`). Las pantallas y los módulos no saben en qué
modo están: llaman a acciones como guardar, enviar, aprobar o crear un proyecto, y el proveedor
aplica los permisos, revalida el estado más reciente y guarda.

```
                     /acceso
         ┌──────────────┴───────────────┐
  Demo (elige un perfil)        Empresa (usuario + contraseña)
         │                              │  src/nucleo/datos/empresa.ts
         │                              │  Supabase Auth → miembros/perfiles → espacios
         ▼                              ▼
  localStorage                   public.espacios (un JSON por organización)
  "sotec-demo-v9"                + respaldo local "fd-empresa-respaldo"
         └──────────────┬───────────────┘
                        ▼
          DemoProvider (useDemo)  →  pantallas de /app, generador, PDF
```

| | Demo | Empresa |
|---|---|---|
| Entrada | `/acceso` → tarjeta de un rol, sin contraseña («Ver como» cambia de rol en vivo) | `/acceso` → usuario o correo y contraseña de Supabase Auth (`admin` = `admin@sotecse.com`) |
| Datos | Ficticios (`src/nucleo/datos/seed.ts`, `src/modulos/equipos/seed.ts`) | Los reales de la organización; parte vacío |
| Dónde viven | `localStorage` (`sotec-demo-v9`); se restablecen en Configuración | `public.espacios.estado` (jsonb) en Supabase |
| Varias pestañas / equipos | Se sincronizan con el evento `storage` | Guardado agrupado (700 ms) con **versión optimista**; cada 15 s y al volver a la pestaña se buscan cambios de otros equipos |
| Conflictos | — | Si otro guardó antes, la actualización no encuentra la versión y se recarga lo más reciente con un aviso |
| Sin conexión | Funciona igual (todo es local) | Abre con la sesión y la última copia guardadas en el equipo; los cambios quedan pendientes y se sincronizan al volver la red (ver [PWA](#app-instalable-y-sin-conexión-pwa)) |
| Rol del usuario | El perfil elegido | El de `miembros.rol` en Supabase (manda sobre lo guardado en el espacio) |

El modo elegido se recuerda en `localStorage` (`fd-modo`). **Fase 1** del modo empresa: el estado
completo de la app se guarda como un documento JSON por organización; los permisos por rol se
aplican en la app y RLS limita `espacios` al equipo interno. La **fase 2** pasa cada módulo a sus
tablas relacionales con RLS (ya existen en las migraciones) y retira `espacios`.

---

## Estructura de carpetas

```
.
├── src/
│   ├── app/                          Rutas de Next.js (App Router)
│   │   ├── page.tsx                  Landing pública (/)
│   │   ├── layout.tsx                Layout raíz: fuentes, metadatos (también los de la PWA), RegistroPWA, DemoProvider
│   │   ├── manifest.ts               Manifiesto de la app instalable (/manifest.webmanifest)
│   │   ├── offline/                  /offline: lo que muestra el service worker si la página no está guardada
│   │   ├── globals.css               Tailwind, colores (claro/oscuro, series) y reglas de impresión
│   │   ├── acceso/                   /acceso: login de la empresa y perfiles de la demo
│   │   ├── firmar/                   /firmar?t=: firma remota del cliente por enlace (sin cuenta)
│   │   ├── imprimir/                 /imprimir: hojas listas para imprimir o guardar en PDF
│   │   ├── api/usuarios/route.ts     Backend: usuarios con login del modo empresa (solo admin)
│   │   └── app/                      El aplicativo (/app), dentro del shell
│   │       ├── layout.tsx            Monta AppShell (barra lateral, barra superior, menú móvil)
│   │       ├── page.tsx              Tablero de indicadores
│   │       ├── nuevo/<tipo>/         Generador de cada formato (reporte, permiso, gasto, cotizacion)
│   │       ├── documentos/           Lista y detalle (/ver?id=) de documentos
│   │       ├── revision/             Bandeja de revisión y aprobación
│   │       ├── proyectos/            Lista, detalle (/ver) y formulario (/editar)
│   │       ├── equipos/              Inventario por cliente y sistema; ficha e historial (/ver)
│   │       ├── cobros/               Cuentas de cobro: lista, nueva y detalle
│   │       ├── clientes/             Directorio de clientes
│   │       ├── usuarios/             Usuarios y roles (demo) o usuarios con login (empresa)
│   │       ├── config/               Configuración: consecutivos, módulos, restablecer la demo
│   │       ├── auditoria/            Registro de auditoría
│   │       └── mapa/                 Mapa del sistema: módulos, base de datos y matriz de roles
│   │
│   ├── servidor/                     Código SOLO del servidor
│   │   └── supabase-admin.ts         Cliente con la llave secreta + verificación del admin que llama
│   │
│   ├── nucleo/                       Lo transversal (sin pantallas)
│   │   ├── datos/                    Capa de datos
│   │   │   ├── DemoProvider.tsx      Proveedor único de datos y acciones (modos demo y empresa)
│   │   │   ├── empresa.ts            Modo empresa: modo, sesión y lectura/guardado de `espacios`
│   │   │   ├── supabase.ts           Cliente de Supabase del navegador (llave publishable)
│   │   │   ├── usuarios-contrato.ts  Contrato de /api/usuarios (tipos, roles, validaciones), compartido
│   │   │   ├── usuarios-api.ts       Cliente tipado de /api/usuarios
│   │   │   └── seed.ts               Datos ficticios de la demo
│   │   ├── tipos.ts                  Tipos comunes (Documento, Usuario, Rol, Estado, Proyecto, Cliente…)
│   │   ├── permisos.ts               Matriz rol → acción; visibilidad de documentos, cuentas y proyectos
│   │   ├── catalogos.ts              Etiquetas y colores de estados y roles
│   │   ├── perfiles.ts               Tarjetas de los perfiles de la demo (acceso y landing)
│   │   ├── validar.ts                Pendientes y % de avance (delegan en cada módulo)
│   │   ├── indicadores.ts            Cálculos del tablero (períodos, KPIs, series)
│   │   ├── proyectos.ts              Indicadores de un proyecto (resumenProyecto)
│   │   ├── variantes.ts              Variantes de formato (SOTEC, FORTOX) y tipos de proyecto: aquí va el formato oficial de Fortox
│   │   ├── impresion.ts              Enlaces y datos de la ruta /imprimir
│   │   ├── rutas.ts                  basePath, assets y rutas de detalle
│   │   ├── letras.ts                 Valor en letras y formato de pesos (cop)
│   │   └── imagenes.ts               Compresión de fotos antes de guardarlas
│   │
│   ├── modulos/                      Un módulo por formato o área de negocio
│   │   ├── contrato.ts               Contrato ModuloDocumento que implementa cada formato
│   │   ├── registro.ts               Registro central: MODULOS, DOCUMENTOS, TIPOS_DOC, infoDoc…
│   │   ├── reportes/                 FO-GSST-22: tipos · catálogo · validación · asistente (index) · plantilla
│   │   ├── permisos/                 F-GSST-13: ídem
│   │   ├── gastos/                   FO-GSST-25: ídem
│   │   ├── cotizaciones/             Cotización: ídem + cálculos de IVA
│   │   ├── cobros/                   Cuentas de cobro: tipos, flujo y plantilla
│   │   ├── equipos/                  Equipos: tipos, sistemas, reglas, lógica, selector y semilla
│   │   └── ordenes/                  Órdenes de servicio: tipos alineados con la base (falta la interfaz)
│   │
│   ├── components/                   Componentes de interfaz
│   │   ├── shell/AppShell.tsx        Shell del aplicativo: barras, menú móvil, avisos, «Ver como»
│   │   ├── generador/                Generador de formatos (asistente + formulario + vista previa)
│   │   ├── chat/                     Asistente conversacional por pasos
│   │   ├── docs/                     Piezas de los formatos: encabezado, firma, texto editable, envío, variante (ConVariante)
│   │   ├── tablero/                  Gráficas y KPIs del tablero
│   │   ├── proyectos/                Piezas de las pantallas de proyectos
│   │   ├── usuarios/                 Panel de usuarios con login (modo empresa)
│   │   ├── mapa/                     Mapa del sistema (esquema.json se genera desde las migraciones)
│   │   ├── landing/                  Secciones de la landing
│   │   ├── acceso/                   Animación de /acceso
│   │   ├── pwa/                      Registro del service worker y botón «Instalar app»
│   │   ├── fx/                       Efectos (aparición, contadores, fondo interactivo)
│   │   └── ui/                       Botones, campos, insignias, modal, «Volver»…
│   │
│   └── lib/utils.ts                  `cn()`: une clases de Tailwind
│
├── supabase/
│   ├── migrations/                   Migraciones SQL (0001 … 0013), en orden
│   ├── seed.sql                      Organización SOTEC, sus formatos y un cliente ficticio
│   ├── instalar.sql                  Migraciones + semilla en un solo archivo (generado)
│   └── tests/                        Pruebas de RLS y flujo para el PostgreSQL desechable
├── scripts/                          Utilidades (ver «Scripts»)
├── tests/
│   ├── unit/                         Valor en letras y cálculos de la cotización
│   └── e2e/demo.cjs                  Recorrido completo de la demo en Chrome
├── public/                           Logos, fotos de la landing, og.jpg, Lottie, íconos de la app (iconos/) y sw.js
└── docs/                             Arquitectura, marca y créditos de imágenes
```

Convenciones:

- Alias de importación `@/` → `src/`.
- Código y comentarios en español. Cada archivo empieza con un comentario que dice para qué sirve.
- `src/servidor/` nunca se importa desde el navegador. Lo que comparten servidor y navegador (por
  ejemplo `usuarios-contrato.ts`) es puro: sin React, sin `window`, sin Supabase.
- Un módulo de documento (`src/modulos/<clave>/index.ts`) no importa `@/modulos/registro` (ciclo).

---

## Rutas

| Ruta | Qué es |
|---|---|
| `/` | Landing de ControlOne |
| `/acceso` | Entrar a la empresa (login) o a la demo por rol |
| `/app` | Tablero (período y filtros por tipo, estado, cliente, técnico, proyecto y mes) |
| `/app/nuevo/reporte` · `permiso` · `gasto` · `cotizacion` | Generador de cada formato (`?id=` continúa; `?proyecto=`, `?cliente=`, `?equipo=` preseleccionan) |
| `/app/documentos`, `/app/documentos/ver?id=` | Lista y detalle |
| `/app/revision` | Revisión y aprobación |
| `/app/proyectos`, `/ver?id=`, `/editar` | Proyectos |
| `/app/equipos`, `/ver?id=` | Equipos e historial |
| `/app/cobros`, `/nueva`, `/ver?id=` | Cuentas de cobro |
| `/app/clientes`, `/app/usuarios`, `/app/config`, `/app/auditoria`, `/app/mapa` | Administración |
| `/firmar?t=<token>` | Firma remota del cliente (sin cuenta; en la demo, solo en el mismo navegador) |
| `/imprimir?doc=` · `?cuenta=` · `?borrador=&tipo=` | Hojas para imprimir o guardar en PDF |
| `/api/usuarios` | API del servidor (ver abajo) |
| `/offline` | Página sin conexión (la sirve el service worker cuando la ruta no está guardada) |
| `/manifest.webmanifest`, `/sw.js` | Manifiesto y service worker de la app instalable |

`?desde=` indica de dónde se abrió una pantalla para que «← Volver a …» regrese al lugar correcto.

---

## Módulos

Cada formato es un **módulo de documento**: implementa `ModuloDocumento`
(`src/modulos/contrato.ts`) y se registra en `src/modulos/registro.ts`. El resto de la app (menú,
listas, tablero, generador, PDF, permisos) lo lee del registro con `infoDoc(tipo)`: nada fuera del
módulo pregunta «¿es reporte o permiso?».

| Módulo | Carpeta | Prefijo | Qué hace |
|---|---|---|---|
| Reportes técnicos (FO-GSST-22) | `src/modulos/reportes/` | RT | Servicio en sitio, equipos atendidos, registro fotográfico como hoja anexa (cámara o galería), firma del cliente en sitio («recibido a satisfacción»), portal o enlace |
| Permisos de trabajo (F-GSST-13) | `src/modulos/permisos/` | PT | Peligros, EPP, verificación, ejecutores y cierre del permiso |
| Legalización de gastos (FO-GSST-25) | `src/modulos/gastos/` | LG | Ítems con la foto de la factura (hoja «Soportes»); interno, el cliente no lo ve |
| Cotizaciones | `src/modulos/cotizaciones/` | COT | Ítems del catálogo e IVA por tarifa; la administración aprueba y envía en un paso; el cliente acepta con su firma |
| Cuentas de cobro | `src/modulos/cobros/` | CC | Ítems desde reportes aprobados, IVA y valor en letras; borrador → emitida → enviada → pagada / anulada |
| Proyectos | `src/nucleo/proyectos.ts`, `/app/proyectos` | PRY | Reúne documentos, cotizaciones y cuentas de un cliente; presupuesto contra gastado |
| Equipos | `src/modulos/equipos/` | — | Inventario cliente → sistema → equipo con historial de reportes |
| Órdenes de servicio | `src/modulos/ordenes/` | — | Tabla lista en la base; falta la interfaz |

Flujo de los documentos: **borrador → en revisión → aprobado → cerrado** (rechazado vuelve al autor
con motivo). Nadie aprueba lo propio; solo el autor edita, envía o borra su borrador. Mientras está
en revisión, el autor puede **«Retirar para corregir»** (vuelve a borrador); ya aprobado, solo el
revisor lo devuelve con motivo. Un reporte que lleva la **firma del cliente tomada en sitio** queda
cerrado al aprobarse. La cotización no pasa por revisión (la aprueba y envía la administración). Los
consecutivos son por tipo y año y nunca se reutilizan. El cliente escrito a mano en un formato que no
está en el directorio se guarda allí al guardar el documento (sin duplicados por mayúsculas, tildes,
puntuación o razón social; si solo se parece a uno existente, se pregunta), también desde el técnico.
Retirar o rechazar un reporte anula la firma del cliente tomada en sitio.

Para **agregar un formato nuevo**, ver «Agregar un formato nuevo» en
[`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).

### Formato según el tipo de proyecto (variantes: SOTEC, FORTOX)

SOTEC también presta servicios para Fortox, y esos reportes deben salir en el **formato de Fortox**.
Cada documento sale con una **variante de formato** (marca): la de SOTEC por defecto u otra
registrada en `src/nucleo/variantes.ts`. Cómo se elige:

1. **Proyecto**: su «Tipo de proyecto» (formulario del proyecto) apunta a una variante. Los tipos se
   definen en **Configuración → Tipos de proyecto y formato** («Servicios SOTEC», «Servicios Fortox»
   y los que agregue la administración).
2. **Cliente** (sin proyecto, o con un proyecto antiguo sin tipo): su «Formato por defecto» (Clientes).
3. Si no: SOTEC.

El generador muestra el chip **«Formato: Servicios Fortox»**, la vista previa cambia en cuanto se
elige el proyecto (en el asistente o en «Proyecto u obra»), y el documento **guarda su variante**
(`variante`) al guardarse: el detalle, `/imprimir`, `/firmar` y el portal del cliente la usan, y
cambiar después el tipo del proyecto no cambia lo ya guardado. Los documentos antiguos sin variante
salen como SOTEC. Hoy FORTOX solo cambia el **reporte técnico**; permisos, gastos y cotizaciones siguen
en el formato de SOTEC. **Consecutivo**: por defecto los reportes de Fortox siguen la misma serie RT;
si Fortox exige numeración propia, se pone `prefijo` (p. ej. `"RTF"`) en la variante y esos reportes
llevan su propia serie (`RTF-001-26`).

**Pendiente: el formato oficial de Fortox.** La variante FORTOX es **provisional** (logo de texto
«FORTOX», «Código: por confirmar», gris neutro). Cuando llegue el formato real, todo se cambia en
**un solo archivo**, `src/nucleo/variantes.ts` (`VARIANTE_FORTOX`):

| Dato | Dónde |
|---|---|
| Logo | copiar a `public/variantes/fortox-logo.png` y poner `logo: "/variantes/fortox-logo.png"` |
| Código, versión, fecha y nombre del formato | `formatos.reporte.codigo`, `.version`, `.fecha` (dd/mm/aaaa), `.nombre` |
| Colores | `colorEncabezado` (franjas de título) y `colorMarca` |
| Textos del pie | `pie` (hoja principal) y `pieAnexo` (registro fotográfico) |
| Campos con otro nombre | `formatos.reporte.etiquetas` («Cliente» → «Puesto», …) |
| Numeración propia (opcional) | `formatos.reporte.prefijo` |
| Quitar el aviso «provisional» | `provisional: true` → quitarlo |

---

## Roles y permisos

Matriz en `src/nucleo/permisos.ts`; la base de datos aplica las mismas reglas con RLS y triggers
(migraciones 0008, 0011 y 0013).

| Acción | Técnico | Coordinador SST (`supervisor`) | Administrador | Cliente |
|---|---|---|---|---|
| Crear reportes, permisos y gastos | ✔ | ✔ | ✔ | — |
| Ver documentos | Solo los suyos | Todo el equipo | Todo el equipo | Los suyos aprobados o cerrados (nunca gastos) |
| Revisar (aprobar / rechazar) | — | ✔ | ✔ | — |
| Cerrar permisos de trabajo | — | ✔ | ✔ | — |
| Cotizaciones y cuentas de cobro (comercial) | — | — | ✔ | Consulta las suyas; acepta cotizaciones con su firma |
| Clientes: agregar uno nuevo desde un formato (`registrar_clientes`) | ✔ | ✔ | ✔ | — |
| Clientes: editar, desactivar y eliminar (`clientes`) | — | ✔ | ✔ | — |
| Retirar su envío mientras está en revisión | ✔ (lo propio) | ✔ (lo propio) | ✔ (lo propio) | — |
| Tomar en sitio la firma del cliente (su reporte, en revisión o aprobado) | ✔ | ✔ | ✔ | — |
| Proyectos | Ve los activos y los suyos | ✔ | ✔ | Los de su empresa |
| Equipos | ✔ (no elimina) | ✔ | ✔ | Los de su empresa (solo lectura) |
| Usuarios, configuración, auditoría, mapa | — | — | ✔ | — |
| Firmar como cliente | — | — | — | ✔ |

En el modo empresa solo inician sesión los roles internos (`admin`, `supervisor`, `tecnico`); el
portal del cliente con login llega en la fase 2.

---

## Backend: Supabase

El proyecto de Supabase está en línea (las migraciones pendientes de aplicar, si las hay, se
anotan en «Pendiente» de `docs/ARQUITECTURA.md`). El esquema es multiempresa:
cada tabla tiene `organizacion_id` y RLS.

| Migración | Contenido |
|---|---|
| `0001_nucleo.sql` | Organizaciones, perfiles, miembros (rol por empresa), clientes, sitios, consecutivos, auditoría, notificaciones, funciones de RLS |
| `0002_operacion.sql` | Formatos, órdenes de servicio, documentos + historial, reglas del flujo, firmas, enlaces de firma remota, archivos |
| `0003_finanzas.sql` | Cuentas de cobro e ítems (y una tabla `gastos` provisional que retira 0007) |
| `0004_storage.sql` | Bucket privado `archivos` con acceso por organización |
| `0005_auth_perfiles.sql` | Perfil automático al registrarse (trigger en `auth.users`); el acceso lo da el admin en `miembros` |
| `0006_endurecer_funciones.sql` | Revoca `EXECUTE` de funciones de trigger; consecutivos solo vía `crear_documento` / `crear_cuenta_cobro` |
| `0007_gastos_como_formato.sql` | Gastos como formato FO-GSST-25 en `documentos`; `formatos.visible_cliente` |
| `0008_separacion_funciones.sql` | Solo el autor edita y envía; nadie aprueba lo propio; reglas de la firma por enlace |
| `0009_proyectos.sql` | Tabla `proyectos` (PRY), proyecto en documentos y cuentas, formato `cotizacion`, firma del cliente en su portal |
| `0010_equipos.sql` | Tablas `equipos` y `documento_equipos` con sus reglas y RLS |
| `0011_comercial_solo_admin.sql` | Cotizaciones y cuentas de cobro solo para `admin` |
| `0012_espacio_empresa.sql` | **`espacios`**: estado del modo empresa por organización (fase 1), RLS para el equipo interno y versión que solo avanza de a uno |
| `0013_campo_tecnico.sql` | Trabajo de campo: firma del cliente en sitio por el autor (PNG ≤ 300 000; aprobar con ella cierra el reporte; retirar o rechazar la anula), retirar para corregir (en revisión → borrador), el técnico crea clientes sin duplicados (`clave_nombre`) y `completar_cliente` llena solo campos vacíos de clientes activos |

Qué usa hoy la app (fase 1):

- **Auth**: `signInWithPassword` desde `/acceso` (`src/nucleo/datos/empresa.ts`). Un usuario sin
  `@` se completa con `@sotecse.com`.
- **`miembros` y `perfiles`**: organización, rol, cargo y nombre de quien inicia sesión. Solo entra
  quien tiene una membresía activa con rol interno.
- **`espacios`**: lectura y guardado del estado con versión optimista. RLS (`espacios_ver`,
  `espacios_guardar`) solo deja al equipo interno de la organización; el trigger
  `espacios_al_guardar` exige que la versión suba de a uno y registra quién guardó.
- **`/api/usuarios`** (servidor, llave secreta): crea y administra las cuentas.

Las demás tablas (documentos, firmas, proyectos, equipos, cuentas…) ya existen con sus reglas y
pruebas, y las usará la fase 2. Detalle de seguridad (RLS, firma por enlace, consecutivos,
advertencias intencionales del Security Advisor): [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).

Flujo para cambiar la base de datos:

```bash
npm run test:db                                                       # 1. migraciones y RLS en PostgreSQL desechable
python3 scripts/aplicar-migracion.py supabase/migrations/00NN_x.sql   # 2. aplica en Supabase (lee .env.local)
bash scripts/armar-instalador.sh                                      # 3. regenera supabase/instalar.sql
python3 scripts/generar-mapa-db.py                                    # 4. actualiza el «Mapa del sistema»
```

---

## API `/api/usuarios`

Route Handler en `src/app/api/usuarios/route.ts`. El contrato tipado y compartido está en
`src/nucleo/datos/usuarios-contrato.ts`; el navegador la llama con `src/nucleo/datos/usuarios-api.ts`
(`listarUsuarios`, `crearUsuario`, `actualizarUsuario`, `eliminarUsuario`) desde
`src/components/usuarios/PanelUsuariosEmpresa.tsx` (pantalla `/app/usuarios` en modo empresa).

**Autenticación y permisos:** cabecera `Authorization: Bearer <access_token>` de la sesión de
Supabase. El servidor valida el token con la llave secreta y exige que sea `admin` activo de una
organización; todo se limita a esa organización y a los roles internos.

| Método | Entrada | Respuesta 200 | Reglas |
|---|---|---|---|
| `GET` | — | `{ usuarios: UsuarioEmpresa[], yo }` | Miembros internos (no clientes), unidos con su perfil |
| `POST` | `{ email, nombre, cargo, rol, clave }` | `{ usuario }` | Correo válido, nombre, rol interno, clave de 8 o más caracteres. Crea la cuenta con el correo confirmado y la membresía; si la membresía falla, borra la cuenta |
| `PATCH` | `{ id, nombre?, cargo?, rol?, activo?, clave? }` | `{ ok: true }` | Solo cambia lo enviado. El admin no puede quitarse el rol ni desactivarse |
| `DELETE` | `?id=` | `{ ok: true }` | Nadie se elimina a sí mismo. Si la persona está en otra organización solo pierde el acceso a esta; si no, se borra su cuenta |

`UsuarioEmpresa = { id, email, nombre, cargo, rol: "tecnico" | "supervisor" | "admin", activo }`.

Errores: `{ error: "<mensaje para mostrar>" }` con el estado HTTP —
`400` datos inválidos · `401` sin sesión o sesión vencida · `403` no es admin · `404` el usuario no
es de la organización · `409` no se pudo eliminar (tiene historial: desactivarlo) · `500` falla de
Supabase · `503` despliegue sin `SUPABASE_SECRET_KEY`.

---

## App instalable y sin conexión (PWA)

ControlOne se instala como una app (ícono propio, ventana sin barra del navegador) y abre sin
conexión. Todo está hecho a mano, sin librerías de PWA:

| Pieza | Archivo |
|---|---|
| Manifiesto (nombre, colores, `start_url` `/app`, atajos) | `src/app/manifest.ts` → `/manifest.webmanifest` |
| Íconos (192, 512, maskable 512, apple-touch-icon 180) | `public/iconos/`, generados con `scripts/generar-iconos-pwa.py` |
| Metadatos de iOS y `theme-color` | `src/app/layout.tsx` (`appleWebApp`, `icons`, `viewport`) |
| Service worker | `public/sw.js` |
| Registro (solo en producción) | `src/components/pwa/RegistroPWA.tsx` |
| Botón «Instalar app» | `src/components/pwa/BotonInstalar.tsx` (menú de perfil del aplicativo y `/acceso`) |
| Página sin conexión | `src/app/offline/` |
| Datos sin conexión del modo empresa | `src/nucleo/datos/empresa.ts` y `DemoProvider.tsx` |

### Instalarla

- **Android (Chrome) y escritorio (Chrome, Edge):** botón **Instalar app** en `/acceso` o en el
  menú de perfil (arriba a la derecha) del aplicativo. También desde el menú del navegador
  («Instalar ControlOne» / ícono de instalar en la barra de direcciones). En Android, mantener
  presionado el ícono muestra los atajos (Nuevo reporte, Documentos, Revisión).
- **iPhone y iPad (Safari):** el botón muestra cómo hacerlo: **Compartir → Agregar a pantalla de
  inicio**. iOS no permite lanzar la instalación desde la página.
- Si la app ya corre instalada, el botón no aparece.

### Qué funciona sin conexión

- **Abrir la app:** la landing, `/acceso`, `/app` y todas las pantallas de `/app/*` quedan
  guardadas al instalar el service worker (la primera visita en línea). Las rutas con `?id=`
  usan la misma página guardada. Una ruta que no esté guardada muestra `/offline`.
- **Demo:** funciona completa (sus datos ya viven en el navegador).
- **Empresa:** después de **al menos un ingreso en línea** en ese equipo. Cada carga y guardado
  exitoso deja en el equipo la sesión (`fd-empresa-sesion`) y la última copia del espacio (estado
  en `fd-empresa-respaldo`; versión y si tiene cambios pendientes en `fd-empresa-copia`). Sin red
  la app abre con esa copia, los cambios se guardan en el equipo y la franja superior dice
  **«Sin conexión · tus cambios se guardan en este equipo»**.
- **Al volver la conexión** (evento `online`, el sondeo de 15 s o al volver a la pestaña) se
  confirma la sesión con Supabase y se envían los cambios con la misma versión optimista de
  siempre. Si mientras tanto otra persona guardó, gana lo más reciente del servidor: se cargan
  esos datos con un aviso (como cualquier conflicto) y los cambios propios que perdieron quedan
  aparte en `fd-empresa-conflicto` por si hay que rescatarlos a mano.

Límites:

- Sin conexión no se puede **iniciar sesión** por primera vez ni cambiar de usuario; **cerrar
  sesión** borra la sesión guardada (sin red ya no se puede volver a entrar). La copia del espacio
  se conserva y, si quedó algo pendiente, se envía cuando la misma persona vuelva a entrar.
- La copia vive en `localStorage` (≈5 MB por sitio): con muchas fotos puede no caber; entonces se
  avisa que no hay espacio en el equipo y no conviene cerrar la app hasta recuperar la conexión.
- Lo que depende del servidor no funciona sin red: `/api/usuarios` (usuarios con login), enviar
  por correo, y ver lo que otros guardaron después de la última sincronización.
- Si la sesión de Supabase venció mientras no había red, al volver se pide iniciar sesión de nuevo;
  los cambios siguen en el equipo y se envían después del ingreso.
- Conflictos: el estado es un solo documento por organización, así que el último en llegar
  sin conexión pierde sus cambios frente a lo guardado entre tanto (fase 1; la fase 2 con tablas
  por módulo lo resuelve por registro).

### Qué guarda en caché el service worker

| Petición | Estrategia |
|---|---|
| `/_next/static/*` (JS, CSS, fuentes con hash) | Primero el caché (inmutables); caché `co-static-<versión>`, hasta 400 archivos |
| Páginas (navegación) | Primero la red (si ya hay copia, espera hasta 5 s); si falla, la copia de esa ruta; si no hay, `/offline`. Caché `co-app-<versión>-<despliegue>` |
| Otros archivos de `public/` (íconos, Lottie, imágenes, manifiesto) | La copia al instante y se renueva en segundo plano |
| `/api/*`, Supabase (`*.supabase.co`), otros dominios, peticiones que no son GET, autenticación, peticiones RSC de Next | **Nunca** pasan por el caché |

`/api/*` lleva además `Cache-Control: no-store` y `/sw.js` se sirve sin caché
(`next.config.mjs`).

### Actualizaciones

Silenciosas, sin interrumpir a nadie:

1. Cada despliegue tiene su versión (`NEXT_PUBLIC_VERSION_APP` en `next.config.mjs`: el commit en
   Vercel). `RegistroPWA` registra `/sw.js?v=<versión>`, así que el navegador detecta el service
   worker nuevo al abrir la app (y cada hora o al volver a la pestaña si quedó abierta).
2. El nuevo se instala **en segundo plano** (guarda las páginas y archivos de la versión nueva),
   se activa solo (`skipWaiting` + `clients.claim`) y borra los cachés de páginas viejos. Los JS
   viejos se conservan por si una pestaña abierta todavía los pide.
3. **No recarga la página:** lo que se está diligenciando sigue intacto. La versión nueva se ve
   en la próxima apertura de la app o navegación completa (las páginas van primero a la red).

**Subir la versión del caché a mano** (cambiar la estrategia o vaciar todo en los equipos): en
`public/sw.js` cambia `VERSION_CACHE = "v1"` por `"v2"`. Al activarse borra todos los cachés
`co-*` anteriores. Si agregas una pantalla nueva en `/app`, súmala a `PAGINAS` en el mismo archivo
para que abra sin conexión desde la instalación (si no, se guarda la primera vez que se visita).

### Desarrollo y pruebas

- En `npm run dev` el service worker **no se registra** (y si quedó uno de una prueba de
  producción en el mismo puerto, se elimina con sus cachés), así no interfiere con la recarga en
  caliente ni con la e2e.
- Para probarlo: `npm run build && npm start`, abrir Chrome → DevTools → Application (Manifest,
  Service workers, Cache storage) y en Network marcar «Offline».
- Íconos nuevos: `python3 scripts/generar-iconos-pwa.py` (necesita Pillow).

---

## Despliegue

- **Vercel** despliega solo cada push a `main` de `carforck/FormatoDigital`. Dominio:
  **controlone.sotecse.com**; el sitio se sirve desde la raíz (`NEXT_PUBLIC_BASE_PATH` vacío en
  `next.config.mjs`).
- Variables en Vercel (Settings → Environment Variables): `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (solo servidor) y
  `NEXT_PUBLIC_SITE_URL`.
- **Autor de los commits:** Vercel rechaza los despliegues de autores que no pertenecen al equipo.
  Antes de hacer commit, configura el autor del equipo en el repositorio:
  `git config user.name "carlos carranza"` y `git config user.email asistenteti@alzakfoundation.org`.
- Los secretos viven en `.env.local` (ignorado por git) y en Vercel; nunca en el código.

---

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` · `build` · `start` · `lint` | Desarrollo (puerto 3100), compilación, servidor de producción y ESLint |
| `bash scripts/reiniciar-dev.sh` | Reinicia el dev en el 3100 con la caché `.next` limpia |
| `npm run test:unit` · `test:e2e` · `test:db` | Pruebas (ver abajo) |
| `bash scripts/probar-db.sh` | Lo que corre `test:db`: PostgreSQL 16 desechable (Podman o Docker) con migraciones, semilla (dos veces) y `supabase/tests/` |
| `python3 scripts/aplicar-migracion.py <archivo.sql>…` | Aplica SQL a Supabase en una transacción (Management API; lee `SUPABASE_ACCESS_TOKEN` y `SUPABASE_PROJECT_REF` de `.env.local`). **Toca producción** |
| `bash scripts/armar-instalador.sh` | Regenera `supabase/instalar.sql` (migraciones + semilla) |
| `python3 scripts/generar-mapa-db.py [--check]` | Regenera `src/components/mapa/esquema.json` desde las migraciones; `--check` falla si está desactualizado |
| `python3 scripts/generar-og.py` | Genera `public/og.jpg` (imagen para compartir, 1200×630) |
| `python3 scripts/generar-lottie.py` | Genera `public/lottie/digitaliza.json` (papel → escáner → celular → check) |
| `python3 scripts/generar-lottie-control.py` | Genera `public/lottie/control.json` (ControlOne conectado con las áreas) |
| `python3 scripts/generar-iconos-pwa.py` | Genera los íconos de la app instalable en `public/iconos/` (192, 512, maskable 512 y apple-touch-icon 180; requiere Pillow) |

---

## Pruebas

| Comando | Qué prueba |
|---|---|
| `npm run test:unit` | Valor en letras (`tests/unit/letras.test.ts`), cálculos de la cotización (`tests/unit/cotizacion.test.ts`), directorio de clientes desde los formatos (`tests/unit/clientes.test.ts`) y variantes de formato (`tests/unit/variantes.test.ts`) |
| `npm run test:e2e` | La demo completa en Chrome (`tests/e2e/demo.cjs`), contra `http://localhost:3100` |
| `npm run test:db` | Migraciones, RLS y flujo en PostgreSQL desechable |

Opciones de la e2e (variables de entorno):

- `SOLO=<sección>`: una sola sección (`flujo`, `responsive`, `controles`, `magno`, `proyectos`,
  `crud`, `equipos`, `navegacion`, `comercial`, `impresion`, `campo`, `variantes`, `listas`).
- `VARIANTES_CAPTURAS=<carpeta>`: con `SOLO=variantes`, guarda capturas (escritorio y 390 px).
- `CAPTURAS_LISTAS=<carpeta>`: con `SOLO=listas` («＋ Agregar otro», 16 px en el celular y
  cliente pegado con su NIT), guarda capturas (escritorio y 390 px).
- `BASE=<url>`: otro servidor (por ejemplo `https://controlone.sotecse.com`).
- `CHROME=<ruta>`: ejecutable de Chrome si no está en la ruta por defecto.

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run test:e2e   # termina en «Todo en verde»
```

---

## Pendientes y hoja de ruta

**Fase 2 de Supabase**

- Pasar cada módulo a sus tablas relacionales con RLS (documentos, firmas, proyectos, equipos,
  cuentas de cobro) y retirar `espacios`.
- Fotos y soportes en Supabase Storage (bucket `archivos`) en lugar de dentro del estado.
- Firma remota por enlace (`/firmar`) en el modo empresa (hoy solo funciona en la demo, en el mismo
  navegador).
- Usuarios con rol `cliente` en el modo empresa (portal del cliente con login).

**Otros**

- Envío de correo desde la plataforma con Resend (PDF adjunto y enlace de firma).
- Órdenes de servicio en la interfaz.
- Gastos reembolsables dentro de las cuentas de cobro.
- Requerimiento de materiales (planeado).
- Formato oficial de Fortox (logo, código, versión, fecha y colores): ver «Formato según el tipo de
  proyecto» en [Módulos](#módulos).

## Datos de la demo

Todos los nombres, cédulas, correos y empresas de la demo son **ficticios** (dominios `.example`);
SOTEC es la única empresa real y aparece con su permiso. No se deben agregar datos reales de
clientes ni de personas al código, a las pruebas ni a la semilla.
