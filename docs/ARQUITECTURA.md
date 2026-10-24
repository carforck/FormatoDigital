# Arquitectura de ControlOne (antes FormatoDigital)

> Guía de entrada, instalación, estructura de carpetas, modos demo/empresa, migraciones,
> API, despliegue y pruebas: [`README.md`](../README.md). Este documento detalla las reglas de
> diseño de cada módulo y de la seguridad.

Plataforma multiempresa para digitalizar los formatos del sistema de gestión
(calidad y SG-SST). **SOTEC** es la primera organización (piloto con sus
clientes). Cada empresa nueva es otra organización con sus datos aislados.

## Módulos

Todos los módulos comparten el **núcleo**. SOTEC trabaja **por proyecto y por
cliente**: cada **proyecto** (obra) de un cliente reúne sus reportes, permisos,
gastos, cotizaciones y cuentas de cobro; la **orden de servicio** será el eje de
cada visita dentro del proyecto.

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
| Proyectos | `src/nucleo/proyectos.ts`, `/app/proyectos` | Activo |
| Cotizaciones | `src/modulos/cotizaciones/` | Activo |
| Requerimiento de materiales | — | Planeado |
| Equipos (inventario por cliente y sistema) | `src/modulos/equipos/`, `/app/equipos` | Activo |

El listado vive en `src/modulos/registro.ts` (`MODULOS`) y se muestra en
*Configuración* dentro del aplicativo.

### Proyectos

- `Proyecto` (`src/nucleo/tipos.ts`): código `PRY-001-26` (consecutivo propio),
  nombre, cliente, sitio, responsable, fechas, estado (activo · en pausa ·
  cerrado), presupuesto y descripción. `Documento.proyectoId` y
  `CuentaCobro.proyectoId` son opcionales.
- Pantallas: `/app/proyectos` (tarjetas con filtros por cliente y estado y
  KPIs: documentos por tipo, cotizado, gastos legalizados, cobrado y
  presupuesto contra gastado), `/app/proyectos/ver?id=` (encabezado, KPIs,
  pestañas por tipo y «Nuevo … en este proyecto») y `/app/proyectos/editar`
  (crear o editar). Los KPIs salen de `resumenProyecto` (`src/nucleo/proyectos.ts`).
- Permisos (`puedeVerProyecto`, acción `proyectos`): administración y SST
  crean y gestionan; el técnico ve los activos y los suyos; el cliente, solo
  los de su empresa y, dentro, solo lo que `puedeVerDoc` le deja ver (nunca
  gastos ni lo que está en revisión).
- **Cliente y proyecto en cada formato:** el generador pregunta el proyecto
  justo después del cliente (asistente) y además muestra los selectores
  «Cliente del directorio» y «Proyecto u obra» sobre el formato (formulario).
  Elegir un proyecto fija también su cliente. Cada módulo decide qué campos
  llena (`alElegirCliente`, `alElegirProyecto`): reporte → «Proyecto» en datos
  generales; permiso → puesto/proyecto y sitio; gastos → centro de costos y
  cliente/obra; cotización → asunto. `?proyecto=<id>` (o `?cliente=<id>`)
  abre cualquier generador ya preseleccionado; la cuenta de cobro acepta
  `?proyecto=` y solo ofrece los reportes de ese proyecto.
- El listado de documentos y el tablero filtran por proyecto.

### Navegación y ciclo de vida

- Cada detalle, formulario y generador tiene «← Volver a …» arriba a la
  izquierda (`Volver` y `useOrigen` en `src/components/ui/volver.tsx`).
  `?desde=` dice de dónde se abrió: `proyecto:<id>` (o `?proyecto=<id>` en el
  generador), `equipo:<id>`, `doc:<id>`, `cuenta:<id>`, `revision` o
  `tablero`; sin origen, vuelve a la lista. Etiquetas: «Volver a <Lista>»
  (como en la barra lateral) y «Volver al proyecto PRY-…», «Volver al
  documento RT-…», «Volver a la cuenta CC-…», «Volver al equipo …».
- Editar un documento, un proyecto o una cuenta vuelve a su detalle. Guardar
  navega al detalle con `router.replace`: «atrás» regresa a donde se abrió el
  formulario, no a un formulario vacío. Si el formulario se abrió desde ese
  mismo detalle o lista (`marcarEdicion`), guardar, cancelar y «Volver»
  regresan con «atrás» (`salirAlDetalle`, `regresarSiViene`) para no apilar
  otra copia del detalle. Borrar también usa `replace`.
- El título de la barra superior distingue crear de editar («Nuevo
  proyecto», «Editar proyecto», «Continuar reporte técnico», «Nuevo equipo»).
- Modales y hojas (rechazo, envío, firma, «Nuevo» en celular, menú,
  notificaciones) se cierran con Esc y con un toque fuera (`fondoQueCierra`:
  solo si el toque empieza y termina en el fondo, así un trazo de firma no la
  cierra).
- Proyectos: crear, editar, pausar, reactivar, cerrar y eliminar solo si no
  tiene documentos ni cuentas (si tiene, se ofrece cerrarlo; la base de datos
  aplica la misma regla con `proyectos_borrar`).
- Clientes: crear, editar, desactivar (sale de los selectores del generador,
  del proyecto y de la cuenta; su historial se conserva) y eliminar solo si no
  tiene documentos, proyectos, cuentas ni usuarios del portal.
- Toda acción destructiva pide confirmación.

### Equipos

Pedido de Magno: «almacenar el nombre del equipo y que muestre todo el
historial de reportes que se le han hecho», sin la complejidad de un GLPI.
Fuera de alcance a propósito: bodega/stock, depreciación, préstamos, tickets,
códigos QR y licencias.

- `Equipo` (`src/modulos/equipos/tipos.ts`, reexportado en `src/nucleo/tipos.ts`):
  cliente, proyecto (opcional), sistema, tipo, nombre, marca, modelo, serial,
  ubicación, estado (operativo · con falla · fuera de servicio · retirado) y
  notas. Lo mínimo para crearlo es sistema, tipo y nombre.
- Sistemas (`catalogo.ts`, `SISTEMAS`): CCTV, alarmas, control de acceso,
  detección de incendio, cómputo y redes, cerca eléctrica; cada uno con sus
  tipos sugeridos. Agregar un sistema = una entrada en el catálogo y su ícono
  en `piezas.tsx` (la base de datos guarda la clave como texto).
- Historial = los documentos que lo marcan (`Documento.equiposIds`,
  `documento_equipos` en la base). El contrato del módulo de documento tiene
  `equipos: { despuesDe }`: el reporte lo activa y el generador pregunta
  «¿Qué equipos atendiste?» después del asunto (paso `componente` del
  asistente) y además muestra el selector «Equipos atendidos» en el
  formulario. Ahí mismo se crea un equipo con lo mínimo: el inventario se arma
  solo con el uso. La plantilla imprime una línea compacta «Equipos atendidos
  (N)» por sistema (hasta 14 nombres, luego «y N más»), así el reporte sigue
  cabiendo en una hoja carta.
- Pantallas: `/app/equipos` (cliente → sistema → equipos, con búsqueda;
  `?cliente=&sistema=` en la URL) y `/app/equipos/ver?id=` (ficha e historial;
  `?nuevo=1` para registrar). Desde la ficha, «Nuevo reporte de este equipo»
  abre el generador con `?equipo=` y el equipo ya marcado; un reporte abierto
  desde el historial (`?desde=equipo:<id>`) ofrece «Volver al equipo».
- Reglas (`reglas.ts`, puras; el proveedor de datos las revalida con el
  estado más reciente): nombre único por cliente y sistema (sin mayúsculas ni
  espacios de más) y un id estable por cliente, sistema y nombre, así un doble
  clic o dos pestañas no duplican; el cliente del equipo no cambia; solo los
  equipos del cliente del documento quedan marcados.

| Operación | Admin | Coordinador SST | Técnico | Cliente | Dónde | Prueba |
|---|---|---|---|---|---|---|
| Ver inventario y ficha | Todos | Todos | Todos | Solo los de su empresa | `/app/equipos`, `/app/equipos/ver` | e2e `equipos` · `10_rls_y_flujo.sql` §10 |
| Ver historial | Todos los reportes | Todos | Los que ve | Solo reportes aprobados o cerrados | Ficha | e2e · SQL |
| Crear (con lo mínimo) | Sí | Sí | Sí | No | Ficha `?nuevo=1` y paso del reporte | e2e · SQL |
| Editar ficha | Sí | Sí | Sí | No (solo lectura) | Ficha | e2e · SQL |
| Con falla / fuera de servicio / retirar / reactivar | Sí | Sí | Sí | No | Ficha (retirar pide confirmación) | e2e · SQL |
| Eliminar | Solo sin reportes | Solo sin reportes | No (retira) | No | Ficha (con confirmación) | e2e · SQL (FK `restrict`) |
| Marcar en un reporte | Autor del reporte | Autor | Autor | No | Generador (borrador o rechazado) | e2e · SQL |

Acción `equipos` en `src/nucleo/permisos.ts`; borrar es de `admin` y
`supervisor` (`puedeEliminarEquipos`).

### Lo comercial: solo la administración

Pedido de SOTEC: «que el admin sea el único que tenga acceso a estos módulos de
cotización y demás; el técnico no». Se interpretó como **lo comercial**
(cotizaciones y cuentas de cobro); reportes, permisos, legalización de gastos,
proyectos y equipos siguen igual (el técnico legaliza sus gastos).

| Operación | Admin | Coordinador SST | Técnico | Cliente |
|---|---|---|---|---|
| Ver cotizaciones (listas, tablero, proyecto, URL, avisos) | Todas | No | No (ni las propias) | Las de su empresa aprobadas o aceptadas |
| Crear, editar, duplicar, eliminar borrador de cotización | Sí | No | No | No |
| Aprobar y enviar la cotización al cliente | Sí (un paso) | No | No | — |
| Aceptar la cotización con su firma | En sitio, ante el cliente | No | No | Sí (portal) |
| Ver cuentas de cobro, cartera, cobrado, «ya se cobró en CC-…» | Todas | No | No | Las suyas emitidas, enviadas o pagadas |
| Crear, editar, emitir, enviar, pagar, anular cuentas | Sí | No | No | No |
| Totales del proyecto | Cotizado, gastos, cobrado | Gastos | Barra de presupuesto | Cotizado |

- **App:** acciones `cotizar` (nueva) y `cobros` / `ver_cobros` solo para
  `admin` (y `ver_cobros` para el cliente) en `src/nucleo/permisos.ts`. Cada
  módulo de documento declara `requiere` (la cotización: `cotizar`);
  `puedeUsarTipo` / `puedeCrearTipo` lo aplican de forma genérica a
  `puedeVerDoc` (listas, tablero, revisión, proyectos, notificaciones), al
  menú, la hoja «Nuevo», las pestañas y totales del proyecto, el generador
  (la ruta `/app/nuevo/<tipo>` muestra «Acceso restringido») y a las acciones
  del `DemoProvider` (guardar, enviar, aprobar, rechazar, cerrar, duplicar,
  eliminar, registrar envío).
- **Base de datos:** `0011_comercial_solo_admin.sql` (ver abajo).

### Cotizaciones

- Módulo de documento (`DOCUMENTOS.cotizacion`, prefijo COT, visible para el
  cliente, `requiere: "cotizar"`). **Regla de aprobación:** la administración
  es quien cotiza y quien aprueba, así que **no hay revisor aparte**:
  borrador → **aprobada** (= enviada al cliente) con el botón «Aprobar y
  enviar al cliente» (`flujo.aprobarAlEnviar`; evento «Aprobó y envió al
  cliente») → **aceptada** (cerrada con la firma del cliente en su portal, en
  sitio o por enlace). No pasa por «en revisión». La separación de funciones
  (nadie aprueba lo propio) sigue para los demás formatos. Su valor (`valor`)
  suma al «cotizado» del proyecto.

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
- **Solo la administración** las crea, las ve y las gestiona (`cobros`,
  `ver_cobros`); el técnico y el Coordinador SST no.
- No es un módulo de documento: tiene su propia tabla, tipos
  (`src/modulos/cobros/tipos.ts`) y pantallas (`/app/cobros`).

## Capacidades del núcleo

- **Firma remota por enlace** (`/firmar?t=<token>`): el cliente abre el
  enlace sin cuenta, lee el reporte y firma. Es de un solo uso y vence a los
  7 días. En la demo los datos están en `localStorage`, así que el enlace solo
  funciona en el mismo navegador donde se generó.
- **Envío por correo o WhatsApp** (modal `src/components/docs/EnviarDocumento.tsx`):
  destinatario, asunto y mensaje editables, con el enlace de firma si aplica.
  En la demo abre `mailto:` o `wa.me`; con la plataforma conectada, el correo
  saldrá por Resend con el PDF adjunto.
- **Valor en letras** (`src/nucleo/letras.ts`): pesos colombianos con las
  concordancias UN/VEINTIÚN, «UN PESO», «DE PESOS» en millones exactos y
  hasta 999.999.999.999 («MIL MILLONES»).
- **Compresión de fotos** (`src/nucleo/imagenes.ts`): lado mayor de 1280 px
  en JPEG; una foto de 4 MB queda en ~100–200 KB. La usan el registro
  fotográfico y los soportes de gastos.
- **Separación de funciones** (`src/nucleo/permisos.ts` y el proveedor de
  datos, igual que la migración 0008): solo el autor edita, envía o borra su
  borrador; nadie aprueba lo propio (`puedeRevisarDoc`); abrir `?id=` de un
  documento ajeno o ya enviado muestra un bloqueo (`PaginaGenerador`).
- **Idempotencia en la demo** (`src/nucleo/datos/DemoProvider.tsx`): cada
  transición revalida el estado y se cancela si ya no aplica (doble clic,
  dos pestañas); los consecutivos salen de contadores por tipo y año, así
  que no se repiten al borrar o cancelar; las pestañas se sincronizan con el
  evento `storage`; una factura no entra en dos cuentas de cobro activas.
- **Generador** (`src/components/generador/`): guarda el avance en el
  navegador y lo recupera, avisa al salir con cambios sin guardar y bloquea
  el doble envío.
- **Impresión:** cada `.doc-print` es una hoja (`break-before: page`). El
  reporte cabe en una carta (`doc-ajustado`) y el permiso en un A4
  (`doc-compacto`); las fotos van de 6 en 6 por hoja anexa con encabezado, y
  filas, fotos y el bloque de aprobación no se parten. El pie dice «Hoja N ·
  Formato/Soportes», no «Página X de Y», porque el total depende del papel.
  - **Ruta dedicada `/imprimir`** (`src/app/imprimir/`, ayuda en
    `src/nucleo/impresion.ts`): todo botón «PDF» / «Imprimir» (detalle del
    documento, generador, cuenta de cobro) abre `/imprimir?doc=<id>`,
    `?cuenta=<id>` o `?borrador=<clave>&tipo=<tipo>&id=<id>` en la misma
    pestaña (en el celular las ventanas emergentes se bloquean). Está fuera del
    shell `/app`: en el DOM solo hay una barra (`print:hidden`) con «Volver» e
    «Imprimir / Guardar PDF» y las hojas en flujo normal, en tema claro. Espera
    `img.decode()` de cada foto y `document.fonts.ready` y llama a
    `window.print()` una vez por apertura (marca `n` en la URL).
  - **Por qué:** Safari (iOS) imprimía solo la franja verde de la cotización.
    La estrategia anterior (`body * { visibility: hidden }` + `.doc-zona`
    `position: absolute`) dejaba el contenido absoluto dentro del contenedor
    con scroll (`overflow-x-auto`) de la vista previa, que medía 16 px; WebKit
    recorta lo absoluto a ese contenedor y no lo pagina. Chrome sí lo pinta.
    Regla: en papel nada que envuelva una hoja es `absolute`/`fixed` ni
    recorta (`overflow` visible), y la hoja es `display: block` (la
    cotización es flex + `overflow-hidden` en pantalla; WebKit no pagina bien
    un flex), sin altura mínima fija. Las rejillas que dependen de `sm:` tienen
    su `print:` (si el navegador imprime con el ancho del celular, las fotos
    siguen de 2 en 2).
  - **Papel:** `@page { size: letter | A4; margin: 0 }` según el formato
    (permiso y legalización A4; reporte, cotización y cuenta de cobro carta);
    cada hoja trae su margen interior.
  - **Nombre del PDF = consecutivo:** `document.title` es
    `COT-004-26 · Cotización · <cliente>` (sin `/ : * ? " < > |`); Chrome,
    Android y Safari lo usan como nombre del archivo. Un borrador nunca
    guardado se llama `COT-borrador-<aaaa-mm-dd>` y la hoja muestra el código
    provisional, como el generador.
  - **Borrador sin guardar:** el generador pasa su contenido en memoria por
    `sessionStorage` (`fd-imprimir-borrador-*`, solo el último); si no está,
    la página usa el guardado automático `fd-generador-<tipo>-<usuario>`. Se
    avisa «Borrador sin guardar — guárdalo para asignarle su consecutivo». Al
    volver, un documento nuevo se recupera del guardado automático y uno ya
    guardado con cambios pendientes, de `fd-generador-retorno`.
  - **«Volver»:** si la impresión se abrió desde el aplicativo en esta pestaña
    (`fd-imprimir-origen`), regresa con «atrás»; si no, a `volver` (solo rutas
    `/app…`).
  - **Ctrl+P dentro del aplicativo** (respaldo de escritorio): con `:has()` se
    saca del flujo todo lo que no lleva a `.doc-zona` y su cadena de
    contenedores queda en bloque sin recorte; sin `visibility` ni `absolute`.
  - **Pruebas:** e2e `impresion` (botón → `/imprimir`, título, contenido,
    borrador, sin `absolute` ni recorte en papel). Safari agrega su propio
    encabezado y pie (título y URL) según su configuración; eso no se controla
    desde la página.
- **Ventanas modales** (`src/components/ui/useModal.ts`): Esc cierra, foco
  inicial dentro, foco atrapado y devuelto al botón que la abrió.

## Tablero e interfaz

- **Tablero** (`src/app/app/page.tsx`, piezas en `src/components/tablero/`,
  cálculos en `src/nucleo/indicadores.ts`): período (30 d, 90 d, 6 m, 12 m),
  filtros por tipo, estado y cliente, y KPIs relativos con variación contra
  el período anterior: documentos, aprobados al primer intento (pp), tiempo
  promedio de aprobación, en revisión ahora y % con firma del cliente.
  Gráficas con leyenda, tooltip y vista de tabla; colores de serie validados
  para daltonismo en claro y oscuro (`--serie-a/b/c` en `globals.css`).
- **Barra lateral** (`AppShell`, `src/components/shell/`): riel de 72 px que se abre al pasar el mouse
  o con foco, y se puede fijar (`fd-sidebar` en `localStorage`).
- **Modo oscuro:** claro / oscuro / sistema (`fd-tema`), con la clase `dark`
  en la raíz del shell. Los formatos siempre se ven blancos, como el papel.

## Datos de la demo

Todos los nombres, cédulas, correos y empresas de la demo son **ficticios**
(dominios `.example`, cédulas 1.000.000.00X); SOTEC es la única empresa real
y aparece con su permiso. No se deben agregar datos reales de clientes ni de
personas al código, a las pruebas ni a la semilla de la base de datos. El
historial de git se reescribió para retirar los datos reales de versiones
anteriores.

## Estructura del código

El mapa de carpetas, con una línea por carpeta y archivo clave, está en el
[`README.md`](../README.md#estructura-de-carpetas).

### Registro genérico de documentos

Nada fuera del módulo pregunta «¿es reporte, permiso o gasto?». Cada módulo
aporta en `ModuloDocumento` lo que el resto lee del registro con
`infoDoc(tipo)` (con valores por defecto para lo opcional):

| Miembro | Para qué |
|---|---|
| `formato` | Control documental (código, nombre, versión, «el/la», plural): encabezado, títulos, filtros y conteos (`formatoDe`, `cantidadDoc`) |
| `prefijo` | Prefijo del consecutivo por defecto; Configuración lo cambia (`prefijoDe`) |
| `Plantilla` | Réplica del formato (`PropsPlantilla`): generador y detalle |
| `clienteDe`, `campoCliente` | Cliente u obra en listados y dónde va el cliente escrito a mano |
| `alElegirProyecto` | Autollenado de los campos de proyecto u obra |
| `visibleCliente` | Si el portal del cliente lo ve (`puedeVerDoc`, igual a `formatos.visible_cliente`) |
| `requiere` | Permiso que exige al personal interno además de `crear` (`cotizar`: lo comercial, solo la administración). Sin él, el módulo no aparece en menús, «Nuevo», listas, pestañas ni totales y su URL queda bloqueada (`puedeUsarTipo`, `puedeCrearTipo`; en la base, `formato_comercial`) |
| `color` | Serie de las gráficas (`--serie-a…e` en `globals.css`) |
| `flujo` | Botón y firma al aprobar, qué escribe al aprobar, quién cierra (`cliente`, `revisor` o `formulario`) y el evento de cierre; `aprobarAlEnviar`: sin revisor aparte, quien tiene el permiso del módulo aprueba al enviar (cotización) |
| `etiquetasEstado` | Concordancia («Aprobada», «Aceptada») en `EstadoBadge tipo=` |
| `duplicar`, `aplicarFirma`, `valor` | Qué se limpia al duplicar, cómo se guarda una firma, valor monetario para los proyectos |

`TIPOS_DOC` fija el orden en el menú, los filtros, el tablero y los proyectos.

### Agregar un formato nuevo

1. Crear `src/modulos/<clave>/` con `tipos.ts`, `catalogo.ts`, `validar.ts`,
   `Plantilla<Nombre>.tsx` (réplica fiel del formato, `export function`, con
   `<Encabezado tipo=…>`) e `index.ts` que implemente `ModuloDocumento`
   (`src/modulos/contrato.ts`) con los miembros de la tabla anterior. El
   `index.ts` no importa `@/modulos/registro` (ciclo).
2. Agregar la clave a `TipoDoc` y al tipo `Documento` (`src/nucleo/tipos.ts`),
   registrarlo en `DOCUMENTOS`, `TIPOS_DOC` y `MODULOS`
   (`src/modulos/registro.ts`), crear `src/app/app/nuevo/<clave>/page.tsx`
   con `PaginaGenerador`, su ícono en `IconoDoc` y la entrada del menú en
   `AppShell` (`src/components/shell/AppShell.tsx`).
3. En base de datos solo se agrega una fila en `formatos` para la
   organización (con `visible_cliente = false` si es interno): los documentos
   guardan su contenido en `documentos.datos` (jsonb), así que no hace falta
   una tabla nueva por formato.

## Base de datos (Supabase / PostgreSQL)

El proyecto de Supabase está **instalado y en línea** (ref.
`thlbjdglwynotglcgxwc`) con todas las migraciones aplicadas.

**Modo empresa (fase 1):** `/acceso` ofrece el login por correo al espacio real
de la empresa o los perfiles de la demo. En modo empresa la app guarda su estado
completo por organización en `public.espacios` (`0012_espacio_empresa.sql`) con
versión optimista (`src/nucleo/datos/empresa.ts`) y lo sincroniza entre equipos;
la demo sigue en `localStorage`. Los permisos por rol se aplican en la app; la
fase 2 pasa cada módulo a sus tablas con RLS y retira `espacios`.

**Sin conexión (app instalable):** el service worker (`public/sw.js`) guarda las
páginas de la app y el modo empresa deja en el equipo la sesión y la última copia
del espacio; sin red se trabaja sobre esa copia y al volver la conexión se envía
con la misma versión optimista (si otro guardó entre tanto, gana el servidor con
aviso). El caché nunca toca `/api/*` ni Supabase. Detalle, límites y
actualizaciones: [`README.md`](../README.md#app-instalable-y-sin-conexión-pwa).

La lista de migraciones (0001 … 0012) con su contenido está en el
[`README.md`](../README.md#backend-supabase).

`supabase/instalar.sql` une migraciones y semilla para instalar un proyecto
nuevo de una vez (SQL Editor → Run). Se regenera, no se edita a mano.

### Seguridad

- **Aislamiento por empresa:** todas las tablas tienen `organizacion_id` y
  RLS. Un usuario solo ve las organizaciones de las que es miembro.
- **Roles por organización** (`miembros.rol`): `admin`, `supervisor`,
  `tecnico`, `cliente`. Un cliente queda atado a su empresa (`cliente_id`) y
  solo ve sus documentos aprobados o cerrados de formatos visibles para él.
  Lo comercial (cotizaciones y cuentas de cobro) es solo de `admin` (0011).
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
  numeración): RT-001-26, PT-001-26, LG-001-26, COT-001-26, CC-001-26 y los
  proyectos PRY-001-26.
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
  auditoría, legalización de gastos (oculta al cliente), cuentas de cobro y
  proyectos (aislamiento entre empresas y clientes, proyecto coherente con el
  cliente, bloqueo al enviar, cotización aceptada por el cliente en su portal).
- `aplicar-migracion.py` envía el SQL a Supabase en una transacción (Management
  API) con `SUPABASE_ACCESS_TOKEN` y `SUPABASE_PROJECT_REF` de `.env.local`.
  Ese archivo **nunca** se sube al repositorio.

## Pruebas y stack

Comandos de prueba, opciones de la e2e (`SOLO`, `BASE`, `CHROME`) y stack: ver el
[`README.md`](../README.md#pruebas).

## Marca

- Logo vigente de SOTEC: `public/sotec-logo-v3.png` (fondo transparente) y
  `public/sotec-logo-v3-oscuro.png` (lema aclarado para fondos oscuros).
- Fotos de la landing: `public/landing/` (Pexels, licencia libre; créditos en
  `docs/creditos-imagenes.md`).
- La landing usa la frase «Lo que no se define, no se puede medir…» como
  **atribuida** a Lord Kelvin, no como cita textual: esa redacción no aparece
  en su conferencia de 1883.
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
| 6 | Al escoger el cliente, que salga en el formato | **Hecho:** asistente y formulario (selector sobre el formato) llenan los datos del cliente en todos los formatos y en la cuenta de cobro (NIT, dirección, contacto, correo, teléfono) |
| 7 | Volver al sitio desde la aplicación | **Hecho:** «Volver al sitio» en la barra lateral y el menú de perfil |
| 8 | El cliente consulta sus reportes | **Hecho:** portal del cliente (reportes, cotizaciones y cuentas emitidas de su empresa) |
| 9 | Trabajo por proyecto y por cliente | **Hecho:** módulo Proyectos con sus documentos, cotizaciones y cuentas de cobro |
| 10 | Equipos con su historial de reportes (cliente → sistema → equipo) | **Hecho:** módulo Equipos; el técnico marca o crea los equipos atendidos en el reporte |

### Pendiente

- Fase 2 de Supabase: cada módulo en sus tablas con RLS (hoy el modo empresa
  guarda el estado completo en `espacios`), fotos en Storage, usuarios con rol cliente
  (portal con login) y firma remota por enlace en el modo empresa. El alta de
  usuarios internos con login ya está (`/api/usuarios`).
- Envío de correo desde la plataforma con Resend (PDF adjunto y enlace de
  firma).
- Órdenes de servicio en la interfaz.
- Incluir los gastos reembolsables en las cuentas de cobro.
- Requerimiento de materiales: planeado.
- Equipos: aplicar `0010_equipos.sql` en Supabase (probada solo en local).
- Comercial solo admin: aplicar `0011_comercial_solo_admin.sql` en Supabase
  (probada solo en local). Los archivos del bucket `archivos` siguen con
  acceso por organización (0004), no por documento.
