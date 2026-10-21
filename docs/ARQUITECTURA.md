# Arquitectura de FormatoDigital

Plataforma multiempresa para digitalizar los formatos del sistema de gestión
(calidad y SG-SST). **SOTEC** es la primera organización (piloto con sus
clientes). Cada empresa nueva es otra organización con sus datos aislados.

## Módulos

Todos los módulos comparten el **núcleo** y se unen a través de la **orden de
servicio**: de cada trabajo cuelgan su permiso, su reporte (con fotos), sus
gastos y su cuenta de cobro.

```
                 NÚCLEO: usuarios y roles · clientes y sitios · firmas · archivos
                         correo · PDF · consecutivos · auditoría · notificaciones
                                            │
                                   ORDEN DE SERVICIO
                         ┌──────────┬───────┴──────┬────────────┐
                 Permiso de trabajo  Reporte técnico  Gastos   Cuenta de cobro
                   (F-GSST-13)      (FO-GSST-22)              (reporte + gastos)
                                    + registro fotográfico
```

| Módulo | Carpeta | Estado |
|---|---|---|
| Núcleo | `src/nucleo/` | Activo |
| Órdenes de servicio | `src/modulos/ordenes/` | En construcción (tabla lista) |
| Permisos de trabajo | `src/modulos/permisos/` | Activo |
| Reportes técnicos | `src/modulos/reportes/` | Activo; falta el registro fotográfico |
| Gastos | `src/modulos/gastos/` | Planeado (esperando el formato de SOTEC) |
| Cuentas de cobro | `src/modulos/cobros/` | Planeado (tabla lista) |

El listado vive en `src/modulos/registro.ts` (`MODULOS`) y se muestra en
*Configuración* dentro del aplicativo.

## Estructura del código

```
src/
├── app/                      Rutas (landing, /acceso, /app/...)
├── components/               UI compartida: shell, chat del asistente, firma, ui/
├── nucleo/                   Lo transversal
│   ├── tipos.ts              Tipos comunes (Documento, Usuario, Rol, Estado…)
│   ├── permisos.ts           Matriz rol → acción y visibilidad de documentos
│   ├── catalogos.ts          Formatos, estados, roles (etiquetas y colores)
│   ├── validar.ts            Pendientes y % de avance (delegan en cada módulo)
│   ├── rutas.ts              basePath, assets, ruta del detalle de documento
│   └── datos/                Proveedor de datos de la demo (localStorage) y semilla
└── modulos/
    ├── contrato.ts           Contrato que implementa cada módulo de documento
    ├── registro.ts           Registro central de módulos
    ├── reportes/             tipos · catálogo · validación · asistente (index) · plantilla
    ├── permisos/             tipos · catálogo · validación · asistente (index) · plantilla
    ├── ordenes/ gastos/ cobros/   tipos alineados con la base de datos
```

### Agregar un formato nuevo

1. Crear `src/modulos/<clave>/` con `tipos.ts`, `catalogo.ts`, `validar.ts`,
   `Plantilla<Nombre>.tsx` (réplica fiel del formato) e `index.ts` que
   implemente `ModuloDocumento` (`src/modulos/contrato.ts`): contenido
   inicial, pasos del asistente, cómo aplicar cada respuesta, autollenado del
   cliente y reglas de validación.
2. Registrarlo en `DOCUMENTOS` y `MODULOS` (`src/modulos/registro.ts`).
3. En base de datos solo se agrega una fila en `formatos` para la
   organización: los documentos guardan su contenido en `documentos.datos`
   (jsonb), así que no hace falta una tabla nueva por formato.

## Base de datos (Supabase / PostgreSQL)

Migraciones en `supabase/migrations/`:

| Archivo | Contenido |
|---|---|
| `0001_nucleo.sql` | organizaciones, perfiles, miembros (rol por empresa), clientes, sitios, consecutivos, auditoría, notificaciones, funciones de RLS |
| `0002_operacion.sql` | formatos, órdenes de servicio, documentos + historial, reglas del flujo, firmas, enlaces de firma remota, archivos |
| `0003_finanzas.sql` | gastos (provisional), cuentas de cobro e ítems |
| `0004_storage.sql` | bucket privado `archivos` con acceso por organización (solo Supabase) |
| `seed.sql` | organización SOTEC, sus formatos y un cliente |

### Seguridad

- **Aislamiento por empresa:** todas las tablas tienen `organizacion_id` y
  RLS. Un usuario solo ve las organizaciones de las que es miembro.
- **Roles por organización** (`miembros.rol`): `admin`, `supervisor`,
  `tecnico`, `cliente`. Un cliente queda atado a su empresa (`cliente_id`) y
  solo ve sus documentos aprobados o cerrados.
- **Reglas en la base de datos, no solo en la app** (trigger
  `documentos_flujo`): transiciones válidas (borrador → en revisión →
  aprobado → cerrado; rechazo con motivo obligatorio), quién puede hacer cada
  una, contenido bloqueado después de enviar, y registro de cada paso en
  `documento_eventos` y `auditoria`.
- **Firma remota:** `crear_enlace_firma` genera un token de un solo uso con
  vencimiento (se guarda solo su hash). El cliente abre el enlace sin cuenta
  (`documento_por_enlace`) y firma (`firmar_con_enlace`). La firma del cliente
  sobre un reporte aprobado lo cierra, y nadie puede cerrar sin esa firma real.
- **Consecutivos** por organización, formato y año, reservados de forma
  atómica (`siguiente_consecutivo`): RT-001-26, PT-001-26, CC-001-26.
- Funciones `SECURITY DEFINER` con `search_path` fijo y `EXECUTE` revocado
  donde no corresponde.

### Probar las migraciones

```bash
bash scripts/probar-db.sh
```

Levanta un PostgreSQL 16 desechable (Podman o Docker), simula lo mínimo de
Supabase (`supabase/tests/00_supabase_stub.sql`), aplica migraciones y semilla
(dos veces, para comprobar que es idempotente) y corre
`supabase/tests/10_rls_y_flujo.sql`: aislamiento entre empresas, visibilidad
por rol, flujo de estados, bloqueo, firma por enlace, auditoría, gastos y
cuentas de cobro.

## Stack de la versión funcional

| Capa | Tecnología |
|---|---|
| App y PDF | Next.js 14 (App Router) en Vercel |
| Datos, login, archivos | Supabase (PostgreSQL + Auth + Storage + RLS) |
| Correo | Resend |

Las cuentas van a nombre del **proveedor (FormatoDigital)**: la plataforma es
de ustedes y cada empresa es una organización cliente.

La demo actual (GitHub Pages) funciona sin servidor con datos en
`localStorage` (`src/nucleo/datos/`). Al conectar Supabase se reemplaza ese
proveedor de datos; los módulos y las pantallas no cambian.

## Pedidos de SOTEC (Magno)

| # | Pedido | Estado / dónde va |
|---|---|---|
| 1 | Añadir cuenta de cobro | Módulo `cobros`: SOTEC le cobra a su cliente; ítems desde los reportes. Tablas y reglas listas |
| 2 | Botones para enviar por correo | Núcleo (Resend): PDF al cliente y enlace de firma. Requiere la versión funcional |
| 3 | Firma del cliente | Existe en sitio y por portal; firma remota por enlace lista en base de datos |
| 4 | Formato de gastos | Módulo `gastos`: esperando el formato de SOTEC para replicarlo fiel |
| 5 | Fotos en el reporte como hoja siguiente | Módulo `reportes` + `archivos`: hoja anexa «Registro fotográfico» en el PDF |
