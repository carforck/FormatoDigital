# Arquitectura de FormatoDigital

Plataforma multiempresa para digitalizar los formatos del sistema de gestión
(calidad y SG-SST). **SOTEC** es la primera organización (piloto con sus
clientes). Cada empresa nueva es otra organización con sus datos aislados.

## Módulos

Todos los módulos comparten el **núcleo** y se unen a través de la **orden de
servicio**: de cada trabajo cuelgan su permiso, su reporte (con fotos), sus
gastos y su cuenta de cobro.

```
        NÚCLEO: usuarios y roles · clientes y sitios · firmas (en sitio y por enlace)
                archivos · correo y WhatsApp · PDF · consecutivos · auditoría
                                            │
                                   ORDEN DE SERVICIO
                         ┌──────────┬───────┴──────┬────────────┐
                 Permiso de trabajo  Reporte técnico  Legalización   Cuenta de cobro
                   (F-GSST-13)      (FO-GSST-22)     de gastos      (ítems desde
                                    + registro       (FO-GSST-25)    los reportes)
                                      fotográfico    + soportes
```

| Módulo | Carpeta | Estado |
|---|---|---|
| Núcleo | `src/nucleo/` | Activo |
| Órdenes de servicio | `src/modulos/ordenes/` | En construcción (tabla lista, falta la interfaz) |
| Permisos de trabajo (F-GSST-13) | `src/modulos/permisos/` | Activo |
| Reportes técnicos (FO-GSST-22) | `src/modulos/reportes/` | Activo, con registro fotográfico como hoja anexa |
| Legalización de gastos (FO-GSST-25) | `src/modulos/gastos/` | Activo |
| Cuentas de cobro | `src/modulos/cobros/` | Activo |

El listado vive en `src/modulos/registro.ts` (`MODULOS`) y se muestra en
*Configuración* dentro del aplicativo.

### Legalización de gastos (FO-GSST-25)

- Es un **módulo de documento** más (`DOCUMENTOS.gasto`): ítems (fecha, tipo,
  descripción, N° de recibo, cantidad, valor) y la **foto de la factura** de
  cada ítem (`soporte`), que sale en la hoja anexa **«Soportes»** del PDF.
- Mismo flujo que los demás: borrador → en revisión → aprobado (**Vo.Bo.**:
  firma del admin o supervisor que aprueba) → cerrado (**reembolsado**).
- **Interno:** el cliente nunca lo ve, aunque el gasto se cargue a su obra
  (`puedeVerDoc` en la app; `formatos.visible_cliente` en la base de datos).

### Cuentas de cobro

- SOTEC le cobra a su cliente por el servicio. Los ítems se toman de los
  reportes técnicos **aprobados o cerrados** del cliente que aún no tienen
  otra cuenta activa.
- Subtotal, **IVA** (%) y total con el **valor en letras**
  (`src/nucleo/letras.ts`: «UN MILLÓN DE PESOS M/CTE»).
- Flujo: borrador → emitida → enviada → pagada / anulada (igual al trigger
  `cuentas_cobro_flujo`). El cliente solo ve sus cuentas ya emitidas.
- No es un módulo de documento: tiene su propia tabla, tipos
  (`src/modulos/cobros/tipos.ts`) y pantallas (`/app/cobros`).

## Capacidades del núcleo

- **Firma remota por enlace** (`/firmar?t=<token>`): el cliente abre el
  enlace sin cuenta, lee el reporte y firma. Es de un solo uso y vence a los
  7 días. En la demo los datos están en `localStorage`, así que el enlace solo
  funciona en el mismo navegador donde se generó.
- **Envío por correo o WhatsApp** (modal `src/components/EnviarDocumento.tsx`):
  destinatario, asunto y mensaje editables, con el enlace de firma si aplica.
  En la demo abre `mailto:` o `wa.me`; con la plataforma conectada, el correo
  saldrá por Resend con el PDF adjunto.
- **Valor en letras** (`src/nucleo/letras.ts`): pesos colombianos con las
  concordancias UN/VEINTIÚN y «DE PESOS» en millones exactos.
- **Compresión de fotos** (`src/nucleo/imagenes.ts`): lado mayor de 1280 px
  en JPEG; una foto de 4 MB queda en ~100–200 KB. La usan el registro
  fotográfico y los soportes de gastos.

## Estructura del código

```
src/
├── app/                      Rutas (landing, /acceso, /firmar, /app/...)
├── components/               UI compartida: shell, chat del asistente, firma, EnviarDocumento, ui/
├── nucleo/                   Lo transversal
│   ├── tipos.ts              Tipos comunes (Documento, Usuario, Rol, Estado…)
│   ├── permisos.ts           Matriz rol → acción y visibilidad de documentos y cuentas
│   ├── catalogos.ts          Formatos, estados, roles (etiquetas y colores)
│   ├── validar.ts            Pendientes y % de avance (delegan en cada módulo)
│   ├── letras.ts             Valor en letras (COP)
│   ├── imagenes.ts           Compresión de fotos antes de guardarlas
│   ├── rutas.ts              basePath, assets, ruta del detalle de documento
│   └── datos/                Proveedor de datos de la demo (localStorage) y semilla
└── modulos/
    ├── contrato.ts           Contrato que implementa cada módulo de documento
    ├── registro.ts           Registro central: MODULOS, DOCUMENTOS, tituloDoc, clienteDoc
    ├── reportes/             tipos · catálogo · validación · asistente (index) · plantilla
    ├── permisos/             tipos · catálogo · validación · asistente (index) · plantilla
    ├── gastos/               tipos · catálogo · validación · asistente (index) · plantilla
    ├── cobros/               tipos y plantilla de la cuenta de cobro
    └── ordenes/              tipos alineados con la base de datos
```

### Agregar un formato nuevo

1. Crear `src/modulos/<clave>/` con `tipos.ts`, `catalogo.ts`, `validar.ts`,
   `Plantilla<Nombre>.tsx` (réplica fiel del formato) e `index.ts` que
   implemente `ModuloDocumento` (`src/modulos/contrato.ts`): contenido
   inicial (`vacio(hoy, usuario)` recibe el usuario para prellenar nombre,
   cédula o cargo), pasos del asistente, cómo aplicar cada respuesta,
   autollenado del cliente y reglas de validación.
2. Registrarlo en `DOCUMENTOS` y `MODULOS` (`src/modulos/registro.ts`) y
   ajustar `tituloDoc` y `clienteDoc` (texto del listado y cliente u obra,
   que cada formato nombra distinto).
3. En base de datos solo se agrega una fila en `formatos` para la
   organización (con `visible_cliente = false` si es interno): los documentos
   guardan su contenido en `documentos.datos` (jsonb), así que no hace falta
   una tabla nueva por formato.

## Base de datos (Supabase / PostgreSQL)

El proyecto de Supabase está **instalado y en línea** (ref.
`thlbjdglwynotglcgxwc`) con todas las migraciones aplicadas. La app todavía
no se conecta a él (ver *Pendiente*).

Migraciones en `supabase/migrations/`:

| Archivo | Contenido |
|---|---|
| `0001_nucleo.sql` | organizaciones, perfiles, miembros (rol por empresa), clientes, sitios, consecutivos, auditoría, notificaciones, funciones de RLS |
| `0002_operacion.sql` | formatos, órdenes de servicio, documentos + historial, reglas del flujo, firmas, enlaces de firma remota, archivos |
| `0003_finanzas.sql` | gastos (provisional, eliminada en 0007), cuentas de cobro e ítems |
| `0004_storage.sql` | bucket privado `archivos` con acceso por organización (solo Supabase) |
| `0005_auth_perfiles.sql` | perfil automático al registrarse (trigger en `auth.users`); registrarse no da acceso: el admin asigna la organización y el rol en `miembros` |
| `0006_endurecer_funciones.sql` | endurecimiento: revoca `EXECUTE` de las funciones de trigger; los consecutivos solo se reservan vía `crear_documento` / `crear_cuenta_cobro`, que pasan a `SECURITY DEFINER` con verificación de rol y pertenencia |
| `0007_gastos_como_formato.sql` | gastos como formato FO-GSST-25 (prefijo LG) en `documentos`; se elimina la tabla provisional `gastos`; columna `formatos.visible_cliente` y política `documentos_ver` que oculta los formatos internos al cliente |
| `seed.sql` | organización SOTEC, sus formatos y un cliente |

`supabase/instalar.sql` une migraciones y semilla para instalar un proyecto
nuevo de una vez (SQL Editor → Run). Se regenera, no se edita a mano.

### Seguridad

- **Aislamiento por empresa:** todas las tablas tienen `organizacion_id` y
  RLS. Un usuario solo ve las organizaciones de las que es miembro.
- **Roles por organización** (`miembros.rol`): `admin`, `supervisor`,
  `tecnico`, `cliente`. Un cliente queda atado a su empresa (`cliente_id`) y
  solo ve sus documentos aprobados o cerrados de formatos visibles para él.
- **Reglas en la base de datos, no solo en la app** (trigger
  `documentos_flujo`): transiciones válidas (borrador → en revisión →
  aprobado → cerrado; rechazo con motivo obligatorio), quién puede hacer cada
  una, contenido bloqueado después de enviar, y registro de cada paso en
  `documento_eventos` y `auditoria`.
- **Firma remota:** `crear_enlace_firma` (requiere sesión) genera un token de
  un solo uso con vencimiento (se guarda solo su hash). El cliente abre el
  enlace sin cuenta (`documento_por_enlace`) y firma (`firmar_con_enlace`).
  La firma del cliente sobre un reporte aprobado lo cierra, y nadie puede
  cerrar sin esa firma real.
- **Consecutivos** por organización, formato y año, reservados de forma
  atómica solo al crear el documento o la cuenta (sin huecos en la
  numeración): RT-001-26, PT-001-26, LG-001-26, CC-001-26.
- Funciones `SECURITY DEFINER` con `search_path` fijo y `EXECUTE` revocado
  donde no corresponde.
- **Security Advisor de Supabase:** las advertencias que quedan (13) son
  intencionales:
  - `documento_por_enlace` y `firmar_con_enlace` abiertas a `anon`: el
    cliente firma sin cuenta; el token es la credencial.
  - `crear_documento`, `crear_cuenta_cobro` y demás RPC `SECURITY DEFINER`
    para `authenticated`: verifican rol y pertenencia por dentro.
  - Funciones auxiliares de RLS (`rol_en`, `es_miembro`, `tiene_rol`,
    `cliente_de`, `comparte_org`): las políticas las necesitan ejecutables.
  - `consecutivos` con RLS y sin políticas a propósito: nadie la lee ni la
    escribe directo, solo las funciones de creación.

### Flujo de cambios en la base de datos

```bash
bash scripts/probar-db.sh                                       # 1. debe pasar
python3 scripts/aplicar-migracion.py supabase/migrations/00NN_x.sql   # 2. aplica en Supabase
bash scripts/armar-instalador.sh                                # 3. regenera supabase/instalar.sql
```

- `probar-db.sh` (también `npm run test:db`) levanta un PostgreSQL 16
  desechable (Podman o Docker), simula lo mínimo de Supabase
  (`supabase/tests/00_supabase_stub.sql`), aplica migraciones y semilla (dos
  veces, para comprobar que es idempotente) y corre
  `supabase/tests/10_rls_y_flujo.sql`: aislamiento entre empresas,
  visibilidad por rol, flujo de estados, bloqueo, firma por enlace,
  auditoría, legalización de gastos (oculta al cliente) y cuentas de cobro.
- `aplicar-migracion.py` envía el SQL a Supabase en una transacción (Management
  API) con `SUPABASE_ACCESS_TOKEN` y `SUPABASE_PROJECT_REF` de `.env.local`.
  Ese archivo **nunca** se sube al repositorio.

## Pruebas

| Comando | Qué prueba |
|---|---|
| `npm run test:db` | Migraciones, RLS y flujo en PostgreSQL desechable |
| `npm run test:unit` | Valor en letras (`tests/unit/letras.test.ts`) |
| `npm run test:e2e` | Demo en el navegador (`tests/e2e/demo.cjs`): secciones `flujo`, `responsive`, `controles`, `magno` |

- `SOLO=<sección> npm run test:e2e` corre una sola sección.
- `BASE=https://formato-digital-nine.vercel.app npm run test:e2e` prueba el
  sitio publicado (por defecto usa `http://localhost:3100`).
- `bash scripts/reiniciar-dev.sh` reinicia el servidor de desarrollo con la
  caché limpia (útil si la página carga sin estilos o con «Cannot find
  module»).

## Stack de la versión funcional

| Capa | Tecnología |
|---|---|
| App y PDF | Next.js 14 (App Router) en Vercel |
| Datos, login, archivos | Supabase (PostgreSQL + Auth + Storage + RLS) |
| Correo | Resend |

Las cuentas van a nombre del **proveedor (FormatoDigital)**: la plataforma es
de ustedes y cada empresa es una organización cliente.

La demo actual funciona sin servidor con datos en `localStorage`
(`src/nucleo/datos/`). Al conectar Supabase se reemplaza ese proveedor de
datos; los módulos y las pantallas no cambian.

## Marca

- Logo vigente de SOTEC: `public/sotec-logo-v3.png`.
- Paleta (colores y su uso) y contenido de la landing:
  `docs/marca-y-landing.json`.

## Pedidos de SOTEC (Magno)

| # | Pedido | Estado / dónde va |
|---|---|---|
| 1 | Añadir cuenta de cobro | **Hecho.** Módulo `cobros`: ítems desde reportes aprobados o cerrados, IVA, valor en letras y flujo borrador → emitida → enviada → pagada / anulada |
| 2 | Botones para enviar por correo | **Hecho en la demo** (correo y WhatsApp con `mailto:` / `wa.me`). Pendiente: envío automático con el PDF adjunto al conectar Resend |
| 3 | Firma del cliente | **Hecho:** en sitio, desde el portal del cliente y por enlace (`/firmar`) |
| 4 | Formato de gastos | **Hecho:** FO-GSST-25 con la foto de cada factura en la hoja «Soportes» |
| 5 | Fotos en el reporte como hoja siguiente | **Hecho:** hoja anexa «Registro fotográfico» |

### Pendiente

- Conectar la app a Supabase: login real y datos compartidos entre usuarios
  y equipos (hoy cada navegador tiene su propia demo).
- Envío de correo desde la plataforma con Resend (PDF adjunto y enlace de
  firma).
- Órdenes de servicio en la interfaz.
- Incluir los gastos reembolsables en las cuentas de cobro.
