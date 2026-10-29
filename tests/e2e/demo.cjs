/**
 * Prueba de punta a punta de la demo en un navegador real.
 *
 *   node tests/e2e/demo.cjs                       # contra http://localhost:3100
 *   BASE=https://formato-digital-nine.vercel.app node tests/e2e/demo.cjs
 *
 * Necesita Chrome/Chromium: CHROME=/ruta/al/chrome (por defecto busca el de Playwright).
 * Recorre: técnico crea y envía un reporte, validación del permiso, acceso
 * restringido, coordinador aprueba, cliente firma; pedidos de Magno (fotos,
 * firma por enlace, envío, cuenta de cobro); trabajo de campo (firma del cliente
 * en sitio, retirar para corregir —anula la firma del cliente—, cámara o galería,
 * clientes nuevos al directorio y los que solo se parecen se preguntan); que ninguna pantalla se desborde en 8 anchos y los controles del shell.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const puppeteer = require("puppeteer-core");

const BASE = (process.env.BASE || "http://localhost:3100").replace(/\/$/, "");
const SOLO = process.env.SOLO; // "flujo" | "responsive" | "controles" | "magno" | "proyectos" | "crud" | "equipos" | "navegacion" | "comercial" | "impresion" | "campo" | "variantes" | "listas"
const CLAVE = "sotec-demo-v9";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function chrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const raiz = path.join(os.homedir(), ".cache/ms-playwright");
  const dirs = fs.existsSync(raiz) ? fs.readdirSync(raiz).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse() : [];
  for (const d of dirs) {
    const p = path.join(raiz, d, "chrome-linux64/chrome");
    if (fs.existsSync(p)) return p;
  }
  throw new Error("No encontré Chrome. Define CHROME=/ruta/al/chrome");
}

let fallos = 0;
function ok(cond, msg) {
  console.log(`${cond ? "✓" : "✗"} ${msg}`);
  if (!cond) fallos++;
}

async function nuevaPagina(b, errores) {
  const p = await b.newPage();
  // El generador avisa al salir con cambios sin guardar: en las pruebas se acepta, como haría el usuario
  p.on("dialog", (d) => d.accept().catch(() => {}));
  p.on("pageerror", (e) => errores.push(e.message));
  p.on("console", (m) => m.type() === "error" && errores.push(m.text().slice(0, 200)));
  return p;
}

/** Clic en el primer elemento (fuera de la barra superior) que contiene el texto. */
async function clic(p, texto, sel = "button") {
  await sleep(60);
  const hecho = await p.evaluate(
    (t, s) => {
      const el = [...document.querySelectorAll(s)].find((e) => !e.closest("header") && e.textContent.trim().includes(t));
      if (el) el.click();
      return !!el;
    },
    texto,
    sel,
  );
  if (process.env.DEPURAR) console.log(`  · clic «${texto}»`);
  if (!hecho) throw new Error(`No encontré «${texto}»`);
  await sleep(350);
}

async function firmar(p) {
  const c = await p.$("canvas");
  const bb = await c.boundingBox();
  await p.mouse.move(bb.x + 30, bb.y + 90);
  await p.mouse.down();
  for (let i = 0; i < 20; i++) await p.mouse.move(bb.x + 30 + i * 15, bb.y + 90 + Math.sin(i) * 25);
  await p.mouse.up();
  await clic(p, "Guardar firma");
}

async function comoUsuario(p, uid) {
  await p.evaluate(
    (k, u) => {
      const s = JSON.parse(localStorage.getItem(k));
      s.usuarioId = u;
      localStorage.setItem(k, JSON.stringify(s));
    },
    CLAVE,
    uid,
  );
}

async function flujo(b, errores) {
  console.log("\n— Flujo por roles");
  const p = await nuevaPagina(b, errores);
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto(`${BASE}/acceso`, { waitUntil: "networkidle0" });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: "networkidle0" });

  await clic(p, "Técnico de campo");
  await p.waitForFunction(() => location.pathname.includes("/app/nuevo/reporte"));
  await sleep(800);
  await clic(p, "Ladrillera Arcillas del Caribe");
  await clic(p, "PRY-001-26");
  await clic(p, "Correctivo");
  await clic(p, String(new Date().getFullYear()));
  await clic(p, "08:00");
  await clic(p, "10:00");
  await clic(p, "Ing. Daniel Ortega");
  await clic(p, "Reparación fibra óptica");
  await clic(p, "Continuar sin equipos");
  await clic(p, "Redactar borrador");
  await clic(p, "Enviar", "form button");
  await clic(p, "Programar mantenimiento");
  await clic(p, "Continuar sin fotos");
  await clic(p, "Andrés Camacho Ruiz");
  await clic(p, "Firmar ahora");
  await firmar(p);
  await clic(p, "Continuar");
  await clic(p, "El cliente firma después");
  await clic(p, "Enviar a revisión");
  await p.waitForFunction(() => location.pathname.includes("/app/documentos/ver"));
  await sleep(500);
  const urlReporte = p.url();
  ok((await p.evaluate(() => document.body.innerText)).includes("En revisión"), "el técnico envía el reporte a revisión");

  await p.goto(`${BASE}/app/nuevo/permiso`, { waitUntil: "networkidle0" });
  await sleep(600);
  await clic(p, "Constructora Horizonte Azul");
  await clic(p, "Sin proyecto");
  await clic(p, "Hotel Brisas del Mar");
  await clic(p, "07:30");
  await clic(p, "Trabajo en alturas");
  await clic(p, "Trabajo en alturas en");
  for (let i = 0; i < 4; i++) await clic(p, "Continuar con");
  await clic(p, "Todas en SÍ");
  await clic(p, "Confirmar verificación");
  await p.type('input[placeholder="Nombre completo"]', "Kevin Mendoza Ortiz");
  await p.type('input[placeholder="Cédula"]', "1000000003");
  await p.type('input[placeholder="ARL / EPS"]', "ARL Andina / EPS Vital");
  await clic(p, "Agregar");
  await clic(p, "Continuar");
  await clic(p, "Firmar ahora");
  await firmar(p);
  await clic(p, "Continuar");
  await clic(p, "Enviar a revisión");
  const pendientes = await p.evaluate(() => [...document.querySelectorAll("li")].map((l) => l.textContent));
  ok(pendientes.includes("Ejecutor 1: firma") && p.url().includes("/nuevo/permiso"), "el permiso sin firma del ejecutor no se deja enviar");

  await p.goto(`${BASE}/app/usuarios`, { waitUntil: "networkidle0" });
  await sleep(400);
  ok((await p.evaluate(() => document.body.innerText)).includes("Acceso restringido"), "el técnico no entra a Usuarios");

  await comoUsuario(p, "u-sup");
  await p.goto(urlReporte, { waitUntil: "networkidle0" });
  await sleep(600);
  await clic(p, "Aprobar");
  ok((await p.evaluate(() => document.querySelector("h1").innerText)).includes("Aprobado"), "el coordinador SST aprueba");

  await comoUsuario(p, "u-cli");
  await p.goto(urlReporte, { waitUntil: "networkidle0" });
  await sleep(600);
  await clic(p, "Firmar como cliente");
  await firmar(p);
  ok((await p.evaluate(() => document.querySelector("h1").innerText)).includes("Cerrado"), "el cliente firma y el reporte queda cerrado");
  await p.close();
}

async function responsive(b, errores) {
  console.log("\n— Responsive (8 anchos)");
  const RUTAS = ["/", "/acceso", "/app", "/app/cobros", "/app/cobros/nueva", "/app/cobros/ver?id=cc-1", "/app/nuevo/gasto", "/app/documentos/ver?id=d-lg-0", "/app/nuevo/reporte", "/app/nuevo/permiso", "/app/documentos", "/app/documentos/ver?id=d-pt-clay",
    "/app/documentos/ver?id=d-rt-clay", "/app/revision", "/app/clientes", "/app/usuarios", "/app/config", "/app/auditoria",
    "/app/proyectos", "/app/proyectos/ver?id=p-1", "/app/proyectos/editar", "/app/nuevo/cotizacion", "/app/nuevo/reporte?proyecto=p-2", "/app/documentos/ver?id=d-cot-0", "/app/cobros/nueva?proyecto=p-1"];
  const ANCHOS = [320, 375, 414, 768, 1024, 1280, 1440, 1920];
  const p = await nuevaPagina(b, errores);
  await p.goto(`${BASE}/acceso`, { waitUntil: "networkidle0" });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: "networkidle0" });
  await clic(p, "Administrador");
  await sleep(1200);
  const problemas = [];
  await p.close();
  // Una pestaña por ancho: con ~200 navegaciones, una sola pestaña acumula memoria y Chrome la cierra
  for (const w of ANCHOS) {
    const t = await nuevaPagina(b, errores);
    await t.setViewport({ width: w, height: 900, isMobile: w < 768 });
    for (const r of RUTAS) {
      await t.goto(BASE + r, { waitUntil: "networkidle0", timeout: 60000 });
      await sleep(300);
      const sw = await t.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (sw > 0) problemas.push(`${w}px ${r} (+${sw}px)`);
    }
    await t.close();
  }
  ok(problemas.length === 0, problemas.length ? `desbordes: ${problemas.join(", ")}` : `sin desbordes en ${RUTAS.length} pantallas × 8 anchos`);
}

async function controles(b, errores) {
  console.log("\n— Controles del shell");
  const p = await nuevaPagina(b, errores);
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto(`${BASE}/acceso`, { waitUntil: "networkidle0" });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: "networkidle0" });
  await clic(p, "Administrador");
  await p.waitForFunction(() => location.pathname.includes("/app"));
  await sleep(900);
  await p.goto(`${BASE}/app/config`, { waitUntil: "networkidle0" });
  await sleep(500);
  ok((await p.evaluate(() => document.body.innerText)).includes("Módulos de la plataforma"), "el administrador ve los módulos en Configuración");
  await p.click('header button[aria-haspopup="menu"]');
  await sleep(300);
  await p.evaluate(() => [...document.querySelectorAll("[role=menuitem]")].find((x) => x.textContent.includes("Coordinador SST")).click());
  await sleep(900);
  ok((await p.evaluate(() => document.querySelector('header button[aria-haspopup="menu"]').innerText)).includes("Coordinador SST"), "el menú de perfil cambia de rol");
  await p.waitForFunction(() => location.pathname.replace(/\/$/, "") === "/app", { timeout: 15000 });
  await sleep(500);
  await p.type("header input", "fibra");
  await p.keyboard.press("Enter");
  await p.waitForFunction(() => location.search === "?q=fibra", { timeout: 15000 }).catch(() => {});
  await sleep(800);
  ok((await p.evaluate(() => location.search === "?q=fibra" && document.querySelectorAll("tbody tr").length === 1)), "el buscador superior filtra documentos");
  await p.goto(`${BASE}/app/config`, { waitUntil: "networkidle0" });
  await sleep(500);
  ok((await p.evaluate(() => document.body.innerText)).includes("Acceso restringido"), "el coordinador SST no entra a Configuración");
  // Barra lateral colapsable: riel de íconos, se abre al pasar el mouse y se puede fijar
  await p.evaluate(() => localStorage.removeItem("fd-sidebar"));
  await p.goto(`${BASE}/app`, { waitUntil: "networkidle0" });
  await sleep(700);
  const ancho = () => p.evaluate(() => Math.round(document.querySelector("aside").getBoundingClientRect().width));
  await p.mouse.move(900, 400);
  await sleep(400);
  ok((await ancho()) === 72, "la barra lateral arranca como riel de 72 px");
  await p.mouse.move(30, 320);
  await sleep(400);
  ok((await ancho()) === 264, "al pasar el mouse la barra lateral se abre");
  await p.click('aside button[aria-label="Fijar la barra lateral abierta"]');
  await p.mouse.move(900, 400);
  await sleep(400);
  ok((await ancho()) === 264 && (await p.evaluate(() => localStorage.getItem("fd-sidebar"))) === "fija", "fijada se queda abierta y se recuerda");
  await p.click('aside button[aria-label="Contraer la barra lateral"]');
  await p.mouse.move(900, 400);
  await sleep(400);

  // Modo oscuro: claro → oscuro → sistema; los documentos siguen en claro
  await p.evaluate(() => localStorage.setItem("fd-tema", "claro"));
  await p.goto(`${BASE}/app/documentos/ver?id=d-rt-clay`, { waitUntil: "networkidle0" });
  await sleep(700);
  await p.click('header button[aria-label*="Cambiar tema"]');
  await sleep(300);
  const tema = await p.evaluate(() => ({
    oscuro: !!document.querySelector(".dark"),
    guardado: localStorage.getItem("fd-tema"),
    fondoDoc: getComputedStyle(document.querySelector(".doc-print")).backgroundColor,
    fondoTarjeta: getComputedStyle(document.querySelector("aside.print\\:hidden.h-fit") || document.body).backgroundColor,
  }));
  ok(tema.oscuro && tema.guardado === "oscuro", "el botón de tema activa el modo oscuro y lo recuerda");
  ok(tema.fondoDoc === "rgb(255, 255, 255)", "en modo oscuro el formato se mantiene blanco como el papel");
  await p.reload({ waitUntil: "networkidle0" });
  await sleep(600);
  ok(await p.evaluate(() => !!document.querySelector(".dark")), "el modo oscuro persiste al recargar");
  await p.click('header button[aria-label*="Cambiar tema"]');
  await p.click('header button[aria-label*="Cambiar tema"]');
  await sleep(300);
  ok((await p.evaluate(() => localStorage.getItem("fd-tema"))) === "claro", "el ciclo vuelve a claro (oscuro → sistema → claro)");

  // Regreso a la landing desde cualquier módulo
  await p.goto(`${BASE}/app/revision`, { waitUntil: "networkidle0" });
  await sleep(500);
  await p.evaluate(() => [...document.querySelectorAll("aside a")].find((a) => a.textContent.includes("Volver al sitio")).click());
  await p.waitForFunction(() => location.pathname.replace(/\/$/, "") === "", { timeout: 15000 }).catch(() => {});
  ok(await p.evaluate(() => location.pathname.replace(/\/$/, "") === ""), "«Volver al sitio» lleva de un módulo a la landing");

  // Portal del cliente: ve el reporte aprobado por firmar y puede cambiar de empresa
  await p.goto(`${BASE}/app`, { waitUntil: "networkidle0" });
  await comoUsuario(p, "u-cli");
  await p.reload({ waitUntil: "networkidle0" });
  await sleep(700);
  ok(await p.evaluate(() => [...document.querySelectorAll("main a")].some((a) => a.textContent.includes("RT-011-26") && a.textContent.includes("Firmar"))), "el cliente ve el reporte RT-011-26 pendiente de su firma");
  await p.goto(`${BASE}/app/documentos/ver?id=d-rt-9`, { waitUntil: "networkidle0" });
  await sleep(600);
  ok(await p.evaluate(() => document.body.innerText.includes("Firmar como cliente")), "el cliente abre el reporte aprobado y puede firmarlo");
  await p.click('header button[aria-haspopup="menu"]');
  await sleep(300);
  await p.select("header select", "c-tango");
  await sleep(900);
  const portal = await p.evaluate(
    (k) => ({
      docs: [...document.querySelectorAll("main a")].map((a) => a.textContent).join(" "),
      cargo: JSON.parse(localStorage.getItem(k)).usuarios.find((u) => u.id === "u-cli").cargo,
    }),
    CLAVE,
  );
  ok(!portal.docs.includes("RT-011-26") && portal.cargo.includes("Horizonte Azul"), "el portal cambia a otra empresa y deja de ver los documentos de la anterior");
  await comoUsuario(p, "u-tec1");

  await p.setViewport({ width: 390, height: 844, isMobile: true });
  await p.goto(`${BASE}/app`, { waitUntil: "networkidle0" });
  await sleep(800);
  await p.evaluate(() => [...document.querySelectorAll("nav button")].find((x) => x.textContent.includes("Nuevo")).click());
  await sleep(400);
  await p.evaluate(() => [...document.querySelectorAll("a")].find((x) => x.textContent.includes("Permiso de trabajo") && x.href.includes("nuevo")).click());
  await p.waitForFunction(() => location.pathname.includes("/app/nuevo/permiso"), { timeout: 15000 });
  ok(true, "la hoja «Nuevo» del celular abre el permiso");
  await p.close();
}

async function magno(b, errores) {
  console.log("\n— Pedidos de Magno: fotos, firma por enlace, envío y cuenta de cobro");
  const p = await nuevaPagina(b, errores);
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto(`${BASE}/acceso`, { waitUntil: "networkidle0" });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: "networkidle0" });

  // 1. Fotos en el reporte: hoja anexa «Registro fotográfico»
  await clic(p, "Técnico de campo");
  await p.waitForFunction(() => location.pathname.includes("/app/nuevo/reporte"));
  await sleep(800);
  await clic(p, "Ladrillera Arcillas del Caribe");
  await clic(p, "Sin proyecto");
  await clic(p, "Preventivo");
  await clic(p, String(new Date().getFullYear()));
  await clic(p, "08:00");
  await clic(p, "10:00");
  await clic(p, "Ing. Daniel Ortega");
  await clic(p, "Mantenimiento preventivo CCTV");
  await clic(p, "Continuar sin equipos");
  await clic(p, "Redactar borrador");
  await clic(p, "Enviar", "form button");
  await clic(p, "Omitir");
  const input = await p.$('form ~ * input[type=file], div input[type=file][capture]');
  await input.uploadFile(path.join(__dirname, "fixtures/foto.jpg"));
  await p.waitForFunction(() => [...document.querySelectorAll("button")].some((x) => x.textContent.includes("Continuar con 1")), { timeout: 15000 });
  await clic(p, "Continuar con 1");
  const anexo = await p.evaluate(() => {
    const h = [...document.querySelectorAll(".doc-print")].find((a) => a.textContent.includes("REGISTRO FOTOGRÁFICO"));
    return h ? h.querySelectorAll("figure img").length : -1;
  });
  ok(anexo === 1, "la foto aparece en la hoja anexa «Registro fotográfico»");
  ok((await p.evaluate(() => document.querySelectorAll(".doc-zona > .doc-print").length)) === 2, "el reporte imprime 2 hojas: formato + anexo");

  // 2. Firma por enlace: el coordinador pide la firma de un reporte aprobado y el cliente firma sin cuenta
  await comoUsuario(p, "u-sup");
  await p.goto(`${BASE}/app/documentos/ver?id=d-rt-2`, { waitUntil: "networkidle0" });
  await sleep(600);
  await clic(p, "Pedir firma al cliente");
  const enlace = await p.evaluate(() => [...document.querySelectorAll("p.font-mono")].map((x) => x.textContent).find((t) => t.includes("/firmar")));
  ok(Boolean(enlace), "se genera el enlace de firma");
  const correo = await p.evaluate(() => [...document.querySelectorAll('[role=dialog] input')].map((i) => i.value));
  ok(correo.includes("obra@horizonteazul.example"), "el envío trae el correo del cliente prellenado");
  await clic(p, "Cerrar", "button[aria-label]").catch(() => {});
  await p.goto(enlace, { waitUntil: "networkidle0" });
  await sleep(800);
  await p.type('input[placeholder="Nombre de quien firma"]', "Arq. Laura Méndez");
  await clic(p, "Dibujar firma");
  await firmar(p);
  await clic(p, "Firmar y enviar");
  ok((await p.evaluate(() => document.body.innerText)).includes("Gracias"), "el cliente firma desde el enlace sin iniciar sesión");
  await p.goto(enlace, { waitUntil: "networkidle0" });
  await sleep(500);
  ok((await p.evaluate(() => document.body.innerText)).includes("no está disponible"), "el enlace no se puede usar dos veces");
  await p.goto(`${BASE}/app/documentos/ver?id=d-rt-2`, { waitUntil: "networkidle0" });
  await sleep(600);
  ok((await p.evaluate(() => document.querySelector("h1").innerText)).includes("Cerrado"), "con la firma del cliente el reporte queda cerrado");

  // 3. Cuenta de cobro desde el reporte cerrado
  await comoUsuario(p, "u-adm");
  await p.goto(`${BASE}/app/documentos/ver?id=d-rt-2`, { waitUntil: "networkidle0" });
  await sleep(600);
  await clic(p, "Crear cuenta de cobro");
  await p.waitForFunction(() => location.pathname.includes("/app/cobros/nueva"));
  await sleep(600);
  await p.type('input[aria-label="Valor unitario"]', "950000");
  await clic(p, "Emitir");
  await p.waitForFunction(() => location.pathname.includes("/app/cobros/ver"), { timeout: 15000 });
  await sleep(600);
  const texto = await p.evaluate(() => document.body.innerText);
  ok(texto.includes("Emitida") && texto.replace(/\s+/g, " ").includes("$ 1.130.500"), "la cuenta se emite con IVA (950.000 + 19 % = 1.130.500)");
  ok(texto.includes("UN MILLÓN CIENTO TREINTA MIL QUINIENTOS PESOS M/CTE"), "valor en letras correcto");
  await p.goto(`${BASE}/app/documentos/ver?id=d-rt-2`, { waitUntil: "networkidle0" });
  await sleep(500);
  ok((await p.evaluate(() => document.body.innerText)).includes("ya se cobró en la cuenta de cobro"), "el reporte queda enlazado a su cuenta de cobro");

  // 4. Legalización de gastos FO-GSST-25 con la foto de la factura
  await comoUsuario(p, "u-tec1");
  await p.goto(`${BASE}/app/nuevo/gasto`, { waitUntil: "networkidle0" });
  await sleep(800);
  await clic(p, "Ladrillera Arcillas del Caribe");
  await clic(p, "Sin proyecto");
  await clic(p, "Ladrillera Arcillas del Caribe · Área de hornos");
  await clic(p, String(new Date().getFullYear()));
  await clic(p, "Omitir");
  await clic(p, "Transporte");
  await p.type('input[placeholder="Descripción o motivo"]', "Taxi a la obra");
  await p.type('input[aria-label="Valor del gasto"]', "45000");
  await clic(p, "Agregar gasto"); // sin recibo ni foto: se acepta en el asistente, la validación lo frena al enviar
  await p.type('input[placeholder="Descripción o motivo"]', "Almuerzo de la comisión");
  await p.type('input[placeholder="N° recibo / factura"]', "FE-123");
  await p.type('input[aria-label="Valor del gasto"]', "28000");
  const foto = await p.$('input[aria-label="Elegir de la galería o archivos: factura o recibo del gasto"]');
  await foto.uploadFile(path.join(__dirname, "fixtures/foto.jpg"));
  await p.waitForFunction(() => document.body.innerText.includes("Factura adjunta"), { timeout: 15000 });
  await clic(p, "Agregar gasto");
  await clic(p, "Continuar con 2");
  await clic(p, "Omitir");
  await clic(p, "Firmar ahora");
  await firmar(p);
  await clic(p, "Continuar");
  await clic(p, "Enviar a revisión");
  const pend = await p.evaluate(() => [...document.querySelectorAll("li")].map((l) => l.textContent));
  ok(pend.includes("Gasto 1: número de recibo o foto de la factura"), "un gasto sin recibo ni foto de factura no se deja enviar");
  // Adjuntar la factura del gasto 1 desde el formato y enviar
  const fotoFila = await p.$('input[aria-label="Elegir de la galería o archivos: factura del gasto 1"]');
  await fotoFila.uploadFile(path.join(__dirname, "fixtures/foto.jpg"));
  await sleep(1500);
  ok((await p.evaluate(() => [...document.querySelectorAll(".doc-zona > .doc-print")].length)) === 2, "con facturas, la legalización trae la hoja «Soportes»");
  ok((await p.evaluate(() => document.body.innerText.replace(/\s+/g, " "))).includes("$ 73.000 COP"), "valor total legalizado: $ 73.000");
  await clic(p, "Enviar a revisión");
  await p.waitForFunction(() => location.pathname.includes("/app/documentos/ver"), { timeout: 15000 });
  await sleep(500);
  const urlGasto = p.url();
  ok((await p.evaluate(() => document.querySelector("h1").innerText)).includes("LG-"), "la legalización se envía con su código LG");

  await comoUsuario(p, "u-sup");
  await p.goto(urlGasto, { waitUntil: "networkidle0" });
  await sleep(600);
  await clic(p, "Dar Vo.Bo. y firmar");
  await firmar(p);
  ok((await p.evaluate(() => document.querySelector("h1").innerText)).includes("Aprobado"), "el coordinador da el Vo.Bo. con su firma");
  await clic(p, "Marcar como reembolsado");
  ok((await p.evaluate(() => document.querySelector("h1").innerText)).includes("Cerrado"), "se marca como reembolsado");

  await comoUsuario(p, "u-cli");
  await p.goto(urlGasto, { waitUntil: "networkidle0" });
  await sleep(500);
  ok((await p.evaluate(() => document.body.innerText)).includes("no disponible"), "el cliente no ve las legalizaciones de gastos");

  // 5. El cliente ve su cuenta emitida en su portal
  await comoUsuario(p, "u-cli");
  await p.goto(`${BASE}/app/cobros`, { waitUntil: "networkidle0" });
  await sleep(600);
  ok((await p.evaluate(() => document.querySelectorAll("tbody tr").length)) >= 1, "el cliente ve sus cuentas de cobro emitidas");
  await p.goto(`${BASE}/app/cobros/nueva`, { waitUntil: "networkidle0" });
  await sleep(400);
  ok((await p.evaluate(() => document.body.innerText)).includes("Acceso restringido"), "el cliente no puede crear cuentas de cobro");
  await p.close();
}

async function proyectos(b, errores) {
  console.log("\n— Proyectos: cliente y proyecto en cada formato, cotización y portal del cliente");
  const p = await nuevaPagina(b, errores);
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto(`${BASE}/acceso`, { waitUntil: "networkidle0" });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: "networkidle0" });
  await clic(p, "Administrador");
  await p.waitForFunction(() => location.pathname.includes("/app"));
  await sleep(900);
  const texto = () => p.evaluate(() => document.body.innerText.replace(/\s+/g, " "));

  // 1. La gerencia crea un proyecto para la ladrillera
  await p.goto(`${BASE}/app/proyectos/editar`, { waitUntil: "networkidle0" });
  await sleep(600);
  await p.type('input[placeholder="CCTV hornos y patio de secado"]', "Monitoreo remoto bodega de producto");
  await p.select("form select", "c-clay");
  await clic(p, "Guardar proyecto");
  await p.waitForFunction(() => location.pathname.includes("/app/proyectos/ver"), { timeout: 15000 });
  await sleep(600);
  const idProyecto = new URL(p.url()).searchParams.get("id");
  ok((await texto()).includes("PRY-006-26") && (await texto()).includes("Monitoreo remoto bodega de producto"), "se crea el proyecto PRY-006-26 con su consecutivo");

  // 2. Desde el proyecto, el técnico abre el reporte con cliente y proyecto ya diligenciados
  await comoUsuario(p, "u-tec1");
  await p.goto(`${BASE}/app/nuevo/reporte?proyecto=${idProyecto}`, { waitUntil: "networkidle0" });
  await sleep(900);
  const prellenado = await p.evaluate(() => {
    const hoja = document.querySelector(".doc-print").innerText;
    return { hoja, sel: [...document.querySelectorAll('section[aria-label="Cliente y proyecto"] select')].map((s) => s.value) };
  });
  ok(prellenado.sel[0] === "c-clay" && prellenado.hoja.includes("PRY-006-26") && prellenado.hoja.includes("sistemas@arcillasdelcaribe.example") && prellenado.hoja.includes("Zona Industrial"), "con ?proyecto= el formato trae cliente, contacto, correo, dirección y proyecto");
  await clic(p, "Ladrillera Arcillas del Caribe");
  await clic(p, "PRY-006-26");
  await clic(p, "Correctivo");
  await clic(p, String(new Date().getFullYear()));
  await clic(p, "08:00");
  await clic(p, "10:00");
  await clic(p, "Ing. Daniel Ortega");
  await clic(p, "Reparación fibra óptica");
  await clic(p, "Continuar sin equipos");
  await clic(p, "Redactar borrador");
  await clic(p, "Enviar", "form button");
  await clic(p, "Programar mantenimiento");
  await clic(p, "Continuar sin fotos");
  await clic(p, "Andrés Camacho Ruiz");
  await clic(p, "Firmar ahora");
  await firmar(p);
  await clic(p, "Continuar");
  await clic(p, "El cliente firma después");
  await clic(p, "Enviar a revisión");
  await p.waitForFunction(() => location.pathname.includes("/app/documentos/ver"), { timeout: 15000 });
  await sleep(600);
  const urlReporte = p.url();
  const codigoReporte = await p.evaluate(() => document.querySelector("h1 .font-mono").textContent);
  ok((await texto()).includes("Proyecto PRY-006-26"), "el reporte enviado queda en el proyecto");
  ok((await texto()).includes("Volver al proyecto PRY-006-26"), "el detalle abierto desde el proyecto ofrece «Volver al proyecto»");
  await p.goBack({ waitUntil: "networkidle0" });
  await sleep(600);
  ok(await p.evaluate((id) => location.pathname.includes("/app/proyectos/ver") && location.search.includes(id), idProyecto), `«atrás» después de guardar vuelve al proyecto, no al formulario vacío (${p.url()})`);

  // 3. El formulario también elige cliente y proyecto (sin el asistente) y llena los campos de obra
  await p.goto(`${BASE}/app/nuevo/gasto`, { waitUntil: "networkidle0" });
  await sleep(800);
  await p.select('section[aria-label="Cliente y proyecto"] select', "c-tango");
  await sleep(200);
  await p.select('section[aria-label="Cliente y proyecto"] label:nth-of-type(2) select', "p-2");
  await sleep(300);
  const hojaGasto = await p.evaluate(() => document.querySelector(".doc-print").innerText);
  ok(hojaGasto.includes("PRY-002-26 · Control de acceso torre B") && hojaGasto.includes("Constructora Horizonte Azul · Control de acceso torre B"), "en el formulario, el proyecto llena centro de costos y cliente/obra del gasto");
  await p.goto(`${BASE}/app/nuevo/permiso?proyecto=p-2`, { waitUntil: "networkidle0" });
  await sleep(800);
  const hojaPermiso = await p.evaluate(() => document.querySelector(".doc-print").innerText.toLowerCase());
  ok(hojaPermiso.includes("constructora horizonte azul") && hojaPermiso.includes("pry-002-26") && hojaPermiso.includes("torre b"), "el permiso trae cliente, puesto/proyecto y sitio de trabajo del proyecto");

  // 4. La coordinadora aprueba y lo ve en la página del proyecto
  await comoUsuario(p, "u-sup");
  await p.goto(urlReporte, { waitUntil: "networkidle0" });
  await sleep(600);
  await clic(p, "Aprobar");
  await p.goto(`${BASE}/app/proyectos/ver?id=${idProyecto}`, { waitUntil: "networkidle0" });
  await sleep(600);
  ok((await texto()).includes(codigoReporte), "el documento aparece en la página del proyecto");
  await p.evaluate((c) => [...document.querySelectorAll("main a")].find((a) => a.textContent.includes(c)).click(), codigoReporte);
  await p.waitForFunction(() => location.pathname.includes("/app/documentos/ver"), { timeout: 15000 });
  await sleep(500);
  await clic(p, "Volver al proyecto", "a");
  await p.waitForFunction(() => location.pathname.includes("/app/proyectos/ver"), { timeout: 15000 });
  ok(p.url().includes(`id=${idProyecto}`), "un documento abierto desde el proyecto vuelve al proyecto con «Volver»");

  // 5. Cotización en un proyecto: la crea la gerencia y la aprueba y envía en un paso (lo comercial es solo de la administración)
  await comoUsuario(p, "u-adm");
  await p.goto(`${BASE}/app/nuevo/cotizacion?proyecto=p-1`, { waitUntil: "networkidle0" });
  await sleep(900);
  await clic(p, "Ladrillera Arcillas del Caribe");
  await clic(p, "PRY-001-26");
  await clic(p, "Instalación de cámaras IP");
  await clic(p, "Instalación de cámara IP");
  await clic(p, "Continuar con 1");
  await clic(p, "Omitir");
  await clic(p, String(new Date().getFullYear()));
  await clic(p, "Contado contra entrega");
  await clic(p, "Inmediato");
  await clic(p, "12 meses");
  await clic(p, "Omitir");
  await clic(p, "Ver resumen");
  await clic(p, "Aprobar y enviar al cliente");
  await p.waitForFunction(() => location.pathname.includes("/app/documentos/ver"), { timeout: 15000 });
  await sleep(600);
  const urlCot = p.url();
  ok((await p.evaluate(() => document.querySelector("h1").innerText)).includes("COT-004-26") && (await texto()).includes("Proyecto PRY-001-26"), "la cotización COT-004-26 queda en el proyecto");
  ok((await p.evaluate(() => document.querySelector("h1").innerText)).includes("Aprobada"), "la gerencia la aprueba y la envía al cliente en un paso (sin revisor aparte)");

  // 6. Portal del cliente: sus proyectos, solo lo visible para él, y acepta la cotización
  await comoUsuario(p, "u-cli");
  await p.goto(`${BASE}/app/proyectos`, { waitUntil: "networkidle0" });
  await sleep(600);
  const portal = await texto();
  ok(portal.includes("PRY-006-26") && portal.includes("PRY-001-26") && !portal.includes("PRY-002-26"), "el cliente ve solo los proyectos de su empresa");
  await p.goto(`${BASE}/app/proyectos/ver?id=p-1`, { waitUntil: "networkidle0" });
  await sleep(600);
  const detalle = await texto();
  ok(detalle.includes("COT-004-26") && !detalle.includes("LG-001-26") && !detalle.includes("Gastos legalizados") && !detalle.includes("RT-009-26"), "dentro del proyecto el cliente ve cotizaciones y lo aprobado, nunca gastos ni lo que está en revisión");
  await p.goto(`${BASE}/app/proyectos/ver?id=p-2`, { waitUntil: "networkidle0" });
  await sleep(500);
  ok((await texto()).includes("no disponible"), "el cliente no abre proyectos de otra empresa");
  await p.goto(urlCot, { waitUntil: "networkidle0" });
  await sleep(600);
  await clic(p, "Aceptar y firmar");
  await firmar(p);
  ok((await p.evaluate(() => document.querySelector("h1").innerText)).includes("Aceptada"), "el cliente acepta la cotización con su firma y queda «Aceptada»");

  // 7. Cuenta de cobro desde el proyecto: trae su cliente
  await comoUsuario(p, "u-adm");
  await p.goto(`${BASE}/app/proyectos/ver?id=${idProyecto}`, { waitUntil: "networkidle0" });
  await sleep(600);
  await clic(p, "Cuenta de cobro", "a");
  await p.waitForFunction(() => location.pathname.includes("/app/cobros/nueva"), { timeout: 15000 });
  await sleep(600);
  const cuenta = await p.evaluate(() => ({ sel: [...document.querySelectorAll("select")].map((s) => s.value), hoja: document.querySelector(".doc-print").innerText }));
  ok(cuenta.sel.includes("c-clay") && cuenta.hoja.includes("LADRILLERA ARCILLAS DEL CARIBE") && cuenta.hoja.includes("PRY-006-26") && cuenta.hoja.includes(codigoReporte) === false, "la cuenta de cobro del proyecto trae su cliente y su proyecto");
  ok(await p.evaluate((c) => document.body.innerText.includes(c), codigoReporte), "la cuenta ofrece los reportes aprobados del proyecto");
  // Cuenta: borrador → editar → emitir → anular (con confirmación)
  await p.evaluate(() => document.querySelector("main input[type=checkbox]").click());
  await sleep(200);
  await p.type('input[aria-label="Valor unitario"]', "500000");
  await clic(p, "Guardar borrador");
  await p.waitForFunction(() => location.pathname.includes("/app/cobros/ver"), { timeout: 15000 });
  await sleep(600);
  ok((await texto()).includes("Borrador") && (await texto()).includes("Volver al proyecto PRY-006-26"), "la cuenta se guarda en borrador y vuelve al proyecto");
  await clic(p, "Editar");
  await p.waitForFunction(() => location.pathname.includes("/app/cobros/nueva"), { timeout: 15000 });
  await sleep(600);
  await p.evaluate(() => {
    const i = document.querySelector('input[placeholder="Mantenimiento CCTV octubre"]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(i, "");
    i.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await p.type('input[placeholder="Mantenimiento CCTV octubre"]', "Monitoreo remoto · primer pago");
  await clic(p, "Guardar borrador");
  await p.waitForFunction(() => location.pathname.includes("/app/cobros/ver"), { timeout: 15000 });
  await sleep(600);
  ok((await texto()).includes("Monitoreo remoto · primer pago"), "la cuenta en borrador se edita");
  await clic(p, "Emitir");
  await clic(p, "Anular");
  ok((await p.evaluate(() => document.querySelector("h1").innerText)).includes("Anulada"), "la cuenta emitida se anula (con confirmación)");
  await p.goto(`${BASE}/app/proyectos/ver?id=${idProyecto}`, { waitUntil: "networkidle0" });
  await sleep(600);
  ok((await texto()).includes("Monitoreo remoto · primer pago") || (await texto()).includes("1 cuenta de cobro") || (await texto()).includes("Cuentas de cobro 1"), "la cuenta aparece en el proyecto");

  // Proyecto: editar, pausar/reactivar, eliminar solo vacío; el técnico solo consulta
  await clic(p, "Editar", "a");
  await p.waitForFunction(() => location.pathname.includes("/app/proyectos/editar"), { timeout: 15000 });
  await sleep(500);
  await p.type('input[placeholder="CCTV hornos y patio de secado"]', " (fase 1)");
  await clic(p, "Guardar proyecto");
  await p.waitForFunction(() => location.pathname.includes("/app/proyectos/ver"), { timeout: 15000 });
  await sleep(500);
  ok((await texto()).includes("Monitoreo remoto bodega de producto (fase 1)"), "el proyecto se edita");
  await clic(p, "Pausar");
  ok((await texto()).includes("En pausa"), "el proyecto se pausa");
  await clic(p, "Reactivar");
  await clic(p, "Eliminar");
  ok((await texto()).includes("no se puede eliminar") && (await texto()).includes("Cerrar el proyecto"), "un proyecto con documentos no se elimina: se ofrece cerrarlo");
  await p.goto(`${BASE}/app/proyectos/editar`, { waitUntil: "networkidle0" });
  await sleep(500);
  await p.type('input[placeholder="CCTV hornos y patio de secado"]', "Proyecto de prueba vacío");
  await p.select("form select", "c-conj");
  await clic(p, "Guardar proyecto");
  await p.waitForFunction(() => location.pathname.includes("/app/proyectos/ver"), { timeout: 15000 });
  await sleep(500);
  await clic(p, "Eliminar");
  await p.waitForFunction(() => location.pathname.replace(/\/$/, "") === "/app/proyectos", { timeout: 15000 });
  await sleep(500);
  ok(!(await texto()).includes("Proyecto de prueba vacío"), "un proyecto vacío se elimina (con confirmación)");
  await comoUsuario(p, "u-tec1");
  await p.goto(`${BASE}/app/proyectos/ver?id=p-1`, { waitUntil: "networkidle0" });
  await sleep(500);
  const tec = await p.evaluate(() => ({ editar: [...document.querySelectorAll("main a, main button")].some((x) => /^(Editar|Pausar|Eliminar)$/.test(x.textContent.trim())), nuevo: !![...document.querySelectorAll("main a")].find((a) => a.textContent.includes("Reporte técnico")) }));
  ok(!tec.editar && tec.nuevo, "el técnico consulta el proyecto y crea documentos en él, pero no lo edita");
  await p.goto(`${BASE}/app/proyectos/editar`, { waitUntil: "networkidle0" });
  await sleep(400);
  ok((await texto()).includes("Acceso restringido"), "el técnico no entra al formulario de proyectos");
  await p.close();
}

async function crud(b, errores) {
  console.log("\n— CRUD: clientes y cotizaciones (duplicar y eliminar borrador)");
  const p = await nuevaPagina(b, errores);
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto(`${BASE}/acceso`, { waitUntil: "networkidle0" });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: "networkidle0" });
  await clic(p, "Administrador");
  await p.waitForFunction(() => location.pathname.includes("/app"));
  await sleep(900);
  const texto = () => p.evaluate(() => document.body.innerText.replace(/\s+/g, " "));

  // Clientes: crear, editar, desactivar (sale de los selectores, conserva historial), eliminar
  await p.goto(`${BASE}/app/clientes`, { waitUntil: "networkidle0" });
  await sleep(500);
  await clic(p, "Nuevo cliente");
  const campos = await p.$$("main form input");
  await campos[0].type("Clínica Puerto Azul");
  await campos[1].type("900.900.900-9");
  await clic(p, "Guardar", "form button[type=submit]");
  ok((await texto()).includes("Clínica Puerto Azul"), "se crea un cliente");
  await clic(p, "Clínica Puerto Azul", "main button[aria-label]");
  const contacto = (await p.$$("main form input"))[3];
  await contacto.type("Dra. Marta Pineda");
  await clic(p, "Guardar", "form button[type=submit]");
  ok((await texto()).includes("Dra. Marta Pineda"), "se edita el cliente");
  await clic(p, "Ladrillera Arcillas del Caribe", "main button[aria-label]");
  await clic(p, "Eliminar", "form button");
  ok((await texto()).includes("desactívalo"), "un cliente con historial no se elimina: se ofrece desactivarlo");
  await clic(p, "Desactivar", "form button");
  ok((await texto()).includes("Inactivo"), "el cliente queda inactivo");
  await p.goto(`${BASE}/app/nuevo/reporte`, { waitUntil: "networkidle0" });
  await sleep(700);
  const enSelector = await p.evaluate(() => [...document.querySelectorAll('section[aria-label="Cliente y proyecto"] option')].some((o) => o.textContent.includes("Ladrillera")) || [...document.querySelectorAll("button")].some((b) => b.textContent.trim() === "Ladrillera Arcillas del Caribe"));
  ok(!enSelector, "un cliente inactivo no aparece al diligenciar formatos");
  await p.goto(`${BASE}/app/documentos/ver?id=d-rt-clay`, { waitUntil: "networkidle0" });
  await sleep(500);
  ok((await texto()).includes("Ladrillera Arcillas del Caribe"), "sus documentos conservan el cliente en el historial");
  await p.goto(`${BASE}/app/clientes`, { waitUntil: "networkidle0" });
  await sleep(500);
  await clic(p, "Ladrillera Arcillas del Caribe", "main button[aria-label]");
  await clic(p, "Reactivar", "form button");
  await clic(p, "Clínica Puerto Azul", "main button[aria-label]");
  await clic(p, "Eliminar", "form button");
  ok(!(await texto()).includes("Clínica Puerto Azul") && !(await texto()).includes("Inactivo"), "un cliente sin historial se elimina y el otro vuelve a estar activo");

  // Cotización: duplicar y eliminar el borrador del autor (la administración: lo comercial es suyo)
  await comoUsuario(p, "u-adm");
  await p.goto(`${BASE}/app/documentos/ver?id=d-cot-0`, { waitUntil: "networkidle0" });
  await sleep(600);
  await clic(p, "Duplicar");
  await p.waitForFunction(() => location.pathname.includes("/app/nuevo/cotizacion"), { timeout: 15000 });
  await sleep(800);
  const dup = new URL(p.url()).searchParams.get("id");
  await p.goto(`${BASE}/app/documentos/ver?id=${dup}`, { waitUntil: "networkidle0" });
  await sleep(600);
  const codDup = await p.evaluate(() => document.querySelector("h1 .font-mono").textContent);
  ok(codDup.startsWith("COT-") && (await texto()).includes("Borrador"), "la cotización se duplica como borrador nuevo");
  await p.click('button[aria-label="Eliminar"]');
  await p.waitForFunction(() => location.pathname.includes("/app/documentos") && !location.pathname.includes("/ver"), { timeout: 15000 });
  await sleep(500);
  ok(!(await texto()).includes(codDup), "el autor elimina su borrador (con confirmación)");
  await p.close();
}


async function equipos(b, errores) {
  console.log("\n— Equipos: inventario por cliente y sistema, historial de reportes y CRUD por rol");
  const p = await nuevaPagina(b, errores);
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto(`${BASE}/acceso`, { waitUntil: "networkidle0" });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: "networkidle0" });
  await clic(p, "Técnico de campo");
  await p.waitForFunction(() => location.pathname.includes("/app"));
  await sleep(900);
  const texto = () => p.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
  const estado = () => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), CLAVE);
  const NUEVO = "Cámara 11 – Horno 3";

  // 1. El técnico crea un reporte: marca 2 equipos existentes y crea 1 nuevo en el paso de equipos
  await p.goto(`${BASE}/app/nuevo/reporte`, { waitUntil: "networkidle0" });
  await sleep(900);
  await clic(p, "Ladrillera Arcillas del Caribe");
  await clic(p, "PRY-001-26");
  await clic(p, "Preventivo");
  await clic(p, String(new Date().getFullYear()));
  await clic(p, "08:00");
  await clic(p, "10:00");
  await clic(p, "Ing. Daniel Ortega");
  await clic(p, "Mantenimiento preventivo CCTV");
  ok((await texto()).includes("¿Qué equipos atendiste?"), "después del asunto, el asistente pregunta los equipos atendidos");
  await clic(p, "NVR principal 16 canales", "label");
  await clic(p, "Cámara 1 – Portería", "label");
  await clic(p, "Nuevo equipo");
  await clic(p, "Cámara domo");
  const nombreNuevo = async () => {
    const inp = await p.$('input[placeholder="Ej: Cámara 7 – Portería"]');
    await inp.click({ clickCount: 3 });
    await inp.type(NUEVO);
  };
  await nombreNuevo();
  // Doble clic: el equipo se crea una sola vez
  await p.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes("Crear y marcar"));
    b.click();
    b.click();
  });
  await sleep(400);
  await nombreNuevo();
  await clic(p, "Crear y marcar");
  ok((await texto()).includes("ya estaba en el inventario"), "crear el mismo equipo otra vez avisa que ya existía");
  let s = await estado();
  ok(s.equipos.filter((e) => e.nombre === NUEVO).length === 1, "el equipo creado dos veces (y con doble clic) no se duplica");
  const idNuevo = s.equipos.find((e) => e.nombre === NUEVO).id;
  const hoja = await p.evaluate(() => document.querySelector(".doc-print").innerText);
  ok(hoja.includes("Equipos atendidos (3)") && hoja.includes(NUEVO) && hoja.includes("NVR principal 16 canales"), "el formato muestra «Equipos atendidos (3)» con los nombres");
  await clic(p, "Continuar con 3");
  await clic(p, "Redactar borrador");
  await clic(p, "Enviar", "form button");
  await clic(p, "Programar mantenimiento");
  await clic(p, "Continuar sin fotos");
  await clic(p, "Andrés Camacho Ruiz");
  await clic(p, "Firmar ahora");
  await firmar(p);
  await clic(p, "Continuar");
  await clic(p, "El cliente firma después");
  await clic(p, "Enviar a revisión");
  await p.waitForFunction(() => location.pathname.includes("/app/documentos/ver"), { timeout: 15000 });
  await sleep(600);
  const urlReporte = p.url();
  const codigo = await p.evaluate(() => document.querySelector("h1 .font-mono")?.textContent ?? "");
  ok((await texto()).includes("Equipos atendidos · 3"), `el reporte ${codigo} queda con sus 3 equipos atendidos`);
  s = await estado();
  ok(s.documentos.find((d) => d.codigo === codigo)?.equiposIds?.length === 3, "el documento guarda la relación con los equipos (equiposIds)");

  // Impresión: el reporte con equipos sigue cabiendo en una hoja
  await p.emulateMediaType("print");
  const altoHoja = await p.evaluate(() => document.querySelector(".doc-print").getBoundingClientRect().height);
  await p.emulateMediaType(null);
  const pdf = await p.pdf({ format: "letter", printBackground: true });
  const paginas = Number((Buffer.from(pdf).toString("latin1").match(/\/Count (\d+)/) || [])[1] || 0);
  ok(paginas === 1, `el reporte con equipos atendidos imprime en una sola hoja carta (${paginas} página(s), alto ${Math.round(altoHoja)} px)`);

  // 2. La coordinadora lo aprueba
  await comoUsuario(p, "u-sup");
  await p.goto(urlReporte, { waitUntil: "networkidle0" });
  await sleep(600);
  await clic(p, "Aprobar");
  ok((await texto()).includes("Aprobado"), "la coordinadora aprueba el reporte");

  // 3. Navegación: cliente → sistema → equipo → reporte → volver
  await p.goto(`${BASE}/app/equipos`, { waitUntil: "networkidle0" });
  await sleep(600);
  ok((await texto()).includes("1. Elige el cliente"), "el equipo interno empieza eligiendo el cliente");
  const activo = await p.evaluate(() => [...document.querySelectorAll("aside a")].find((a) => a.getAttribute("href") === "/app/equipos")?.className.includes("font-medium"));
  ok(activo && (await p.evaluate(() => document.querySelector("header").innerText.includes("Equipos"))), "«Equipos» queda activo en la barra lateral y en el título");
  await clic(p, "Ladrillera Arcillas del Caribe");
  await p.waitForFunction(() => location.search.includes("cliente=c-clay"));
  await clic(p, "Sistema CCTV");
  await p.waitForFunction(() => location.search.includes("sistema=cctv"));
  await sleep(300);
  ok(!(await texto()).includes("Panel de alarma bodega") && (await texto()).includes(NUEVO), "el sistema CCTV filtra el inventario (sin los equipos de alarma)");
  await clic(p, NUEVO, "a");
  await p.waitForFunction(() => location.pathname.includes("/app/equipos/ver"));
  await sleep(500);
  ok((await texto()).includes(codigo) && (await texto()).includes("Historial de reportes · 1"), "la ficha del equipo nuevo muestra el reporte en su historial");
  ok(await p.evaluate(() => document.querySelector("header").innerText.includes("Ficha del equipo")), "el título de la barra superior es «Ficha del equipo»");
  await clic(p, codigo, "a");
  await p.waitForFunction(() => location.pathname.includes("/app/documentos/ver"));
  await sleep(500);
  ok((await texto()).includes(`Volver al equipo ${NUEVO}`), "el reporte abierto desde el historial ofrece «Volver al equipo»");
  await clic(p, `Volver al equipo ${NUEVO}`, "a");
  await p.waitForFunction(() => location.pathname.includes("/app/equipos/ver"));
  await sleep(400);
  ok((await texto()).includes("Historial de reportes"), "«Volver al equipo» regresa a la ficha");
  await p.goBack({ waitUntil: "networkidle0" });
  await sleep(400);
  ok(p.url().includes("/app/documentos/ver"), "el botón «atrás» del navegador vuelve al reporte");
  await p.goBack({ waitUntil: "networkidle0" });
  await sleep(400);
  ok(p.url().includes("/app/equipos/ver") && p.url().includes("sistema=cctv"), "otro «atrás» vuelve a la ficha (sin trampas en el historial)");
  await clic(p, "Volver a Equipos", "a");
  await p.waitForFunction(() => location.pathname === "/app/equipos");
  ok(p.url().includes("cliente=c-clay") && p.url().includes("sistema=cctv"), "«Volver a Equipos» regresa al mismo cliente y sistema");

  // 4. CRUD del técnico: crear desde Equipos, editar, fuera de servicio, retirar (sin eliminar)
  await comoUsuario(p, "u-tec1");
  await p.goto(`${BASE}/app/equipos?cliente=c-conj`, { waitUntil: "networkidle0" });
  await sleep(500);
  await clic(p, "Nuevo equipo", "a");
  await p.waitForFunction(() => location.search.includes("nuevo=1"));
  await sleep(400);
  ok(await p.evaluate(() => document.querySelector("form select").value === "c-conj"), "«Nuevo equipo» abre el formulario con el cliente que se estaba viendo");
  await p.select("form label:nth-of-type(3) select", "alarmas");
  await p.select('select[aria-label="Tipo de equipo"]', "Teclado");
  await p.type('input[placeholder="Ej: Cámara 7 – Portería"]', "Teclado portería vehicular");
  await clic(p, "Registrar equipo", "button[type=submit]");
  await p.waitForFunction(() => location.search.includes("ok=creado"), { timeout: 10000 });
  await sleep(400);
  ok((await texto()).includes("Equipo registrado") && (await texto()).includes("Teclado portería vehicular"), "el técnico registra un equipo desde Equipos");
  await clic(p, "Editar ficha");
  await p.type('input[placeholder="Ej: Dahua"]', "Paradox");
  await clic(p, "Guardar cambios", "button[type=submit]");
  ok((await texto()).includes("Cambios guardados") && (await texto()).includes("Paradox"), "el técnico edita la ficha (marca)");
  await clic(p, "Fuera de servicio");
  ok((await texto()).includes("Estado: Fuera de servicio"), "el técnico marca el equipo fuera de servicio (estado con texto)");
  ok(!(await texto()).includes("Eliminar"), "el técnico no ve «Eliminar» (solo retira)");
  await clic(p, "Retirar");
  ok((await texto()).includes("Reactivar") && (await texto()).includes("Retirado"), "retirar pide confirmación y deja el equipo retirado (reactivable)");
  const urlTeclado = p.url().replace(/&ok=creado/, "");
  // Doble creación desde la ficha: mismo nombre, mismo cliente y sistema → error, no duplica
  await p.goto(`${BASE}/app/equipos/ver?nuevo=1&cliente=c-conj&sistema=alarmas`, { waitUntil: "networkidle0" });
  await sleep(400);
  await p.select('select[aria-label="Tipo de equipo"]', "Teclado");
  await p.type('input[placeholder="Ej: Cámara 7 – Portería"]', "teclado  portería vehicular");
  await clic(p, "Registrar equipo", "button[type=submit]");
  s = await estado();
  ok((await texto()).includes("Ya existe") && s.equipos.filter((e) => /teclado portería vehicular/i.test(e.nombre)).length === 1, "registrar un nombre repetido (mayúsculas y espacios) se rechaza sin duplicar");

  // 5. Administración: eliminar solo sin historial (con confirmación); con reportes se ofrece retirar
  await comoUsuario(p, "u-adm");
  await p.goto(`${BASE}/app/equipos/ver?id=eq-clay-nvr`, { waitUntil: "networkidle0" });
  await sleep(400);
  ok((await texto()).includes("no se elimina: se retira") && !(await p.evaluate(() => [...document.querySelectorAll("button")].some((x) => x.textContent.trim() === "Eliminar"))), "un equipo con reportes no se puede eliminar: se ofrece retirarlo");
  const histAdm = await p.evaluate(() => document.querySelector("#titulo-historial").innerText);
  await p.goto(urlTeclado, { waitUntil: "networkidle0" });
  await sleep(400);
  await clic(p, "Eliminar");
  await p.waitForFunction(() => location.pathname === "/app/equipos", { timeout: 10000 });
  s = await estado();
  ok(!s.equipos.some((e) => /teclado portería vehicular/i.test(e.nombre)), "la administración elimina (con confirmación) un equipo sin reportes");

  // 6. Cliente: ve sus equipos y su historial (solo reportes visibles), sin editar
  await comoUsuario(p, "u-cli");
  await p.goto(`${BASE}/app/equipos`, { waitUntil: "networkidle0" });
  await sleep(600);
  const tCli = await texto();
  ok(tCli.includes("NVR principal 16 canales") && !tCli.includes("Energizador cerca perimetral") && !tCli.includes("Nuevo equipo"), "el cliente ve solo los equipos de su empresa y no puede crear");
  await p.goto(`${BASE}/app/equipos/ver?id=eq-clay-nvr`, { waitUntil: "networkidle0" });
  await sleep(400);
  const histCli = await p.evaluate(() => document.querySelector("#titulo-historial").innerText);
  const nCli = Number(histCli.replace(/\D+/g, " ").trim().split(" ").pop());
  const nAdm = Number(histAdm.replace(/\D+/g, " ").trim().split(" ").pop());
  ok(nCli > 0 && nCli < nAdm && (await texto()).includes(codigo), `el cliente ve el historial del equipo solo con reportes aprobados o cerrados (${nCli} de ${nAdm})`);
  ok(!(await texto()).includes("Editar ficha") && !(await texto()).includes("Retirar"), "el cliente ve la ficha en solo lectura");
  await p.goto(`${BASE}/app/equipos/ver?id=eq-conj-ene`, { waitUntil: "networkidle0" });
  await sleep(300);
  ok((await texto()).includes("Equipo no disponible"), "el cliente no abre equipos de otra empresa");
  await p.goto(`${BASE}/app/equipos/ver?nuevo=1`, { waitUntil: "networkidle0" });
  await sleep(300);
  ok((await texto()).includes("no registra equipos"), "el cliente no puede abrir el formulario de nuevo equipo");

  // 7. Estado vacío que enseña y móvil sin contenido tapado por la barra inferior
  await comoUsuario(p, "u-adm");
  await p.goto(`${BASE}/app/clientes`, { waitUntil: "networkidle0" });
  await p.goto(`${BASE}/app/equipos?cliente=c-clay&sistema=computo`, { waitUntil: "networkidle0" });
  await p.evaluate((k) => {
    const st = JSON.parse(localStorage.getItem(k));
    st.clientes.push({ id: "c-vacio", nombre: "Hotel Mirador del Puerto", direccion: "", contacto: "", cargo: "", correo: "", telefono: "", sitio: "" });
    localStorage.setItem(k, JSON.stringify(st));
  }, CLAVE);
  await p.goto(`${BASE}/app/equipos?cliente=c-vacio`, { waitUntil: "networkidle0" });
  await sleep(500);
  ok((await texto()).includes("Los equipos se crean solos") && (await texto()).includes("Registrar un equipo"), "el estado vacío explica cómo se crean los equipos y ofrece registrar uno");
  for (const w of [320, 390]) {
    await p.setViewport({ width: w, height: 760 });
    for (const ruta of ["/app/equipos?cliente=c-clay", "/app/equipos/ver?id=eq-clay-nvr"]) {
      await p.goto(`${BASE}${ruta}`, { waitUntil: "networkidle0" });
      await sleep(400);
      const r = await p.evaluate(() => {
        window.scrollTo(0, document.documentElement.scrollHeight);
        const nav = [...document.querySelectorAll("nav")].find((n) => getComputedStyle(n).position === "fixed" && n.getBoundingClientRect().bottom >= innerHeight - 1);
        const ultimo = [...document.querySelectorAll("main section, main ul > li, main p")].filter((e) => e.offsetParent).pop();
        return {
          sw: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          tapado: nav && ultimo ? ultimo.getBoundingClientRect().bottom > nav.getBoundingClientRect().top + 1 : false,
        };
      });
      ok(r.sw <= 0 && !r.tapado, `${ruta} a ${w}px: sin desborde horizontal y nada tapado por la barra inferior`);
    }
  }
  await p.close();
}

async function navegacion(b, errores) {
  console.log("\n— Navegación: «Volver» según el origen, atrás/adelante sin duplicados y la ida y vuelta landing ↔ app");
  const p = await nuevaPagina(b, errores);
  await p.setViewport({ width: 1440, height: 900 });
  const ruta = () => p.url().replace(BASE, "");
  const texto = () => p.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
  const volver = () => p.evaluate(() => [...document.querySelectorAll("main a")].find((a) => a.textContent.includes("Volver"))?.textContent.trim() ?? "");
  const titulo = () => p.evaluate(() => document.querySelector("header p.truncate")?.textContent ?? "");
  const atras = async () => {
    await p.goBack({ waitUntil: "networkidle0" });
    await sleep(500);
    return ruta();
  };
  const esperar = (fn, arg) => p.waitForFunction(fn, { timeout: 15000 }, arg);

  // 1. Landing → acceso → app → «Volver al sitio» → atrás regresa a la app; /acceso ofrece continuar la sesión
  await p.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: "networkidle0" });
  await p.evaluate(() => [...document.querySelectorAll("a")].find((a) => a.getAttribute("href") === "/acceso").click());
  await esperar(() => location.pathname.startsWith("/acceso"));
  await sleep(500);
  ok(!(await texto()).includes("Continuar como"), "sin sesión, /acceso solo ofrece elegir perfil");
  await clic(p, "Administrador");
  await esperar(() => location.pathname.startsWith("/app"));
  await sleep(800);
  await p.evaluate(() => [...document.querySelectorAll("aside a")].find((a) => a.textContent.includes("Volver al sitio")).click());
  await esperar(() => location.pathname === "/");
  await sleep(500);
  ok(ruta() === "/", "«Volver al sitio» lleva a la landing");
  ok((await atras()) === "/app", "desde la landing, «atrás» regresa a la app con la sesión");
  await p.goto(`${BASE}/acceso`, { waitUntil: "networkidle0" });
  await sleep(400);
  await clic(p, "Continuar como Gerencia SOTEC", "a");
  await esperar(() => location.pathname === "/app");
  ok(ruta() === "/app", "con sesión, /acceso ofrece «Continuar como …» y vuelve al tablero");

  // 2. Editar un documento desde su detalle: «Volver al documento», guardar regresa al detalle y «atrás» a la lista (sin duplicados)
  await comoUsuario(p, "u-tec1");
  await p.goto(`${BASE}/app/documentos`, { waitUntil: "networkidle0" });
  await sleep(500);
  await clic(p, "RT-007-26", "a");
  await esperar(() => location.search.includes("id=d-rt-5"));
  await sleep(500);
  await clic(p, "Editar");
  await esperar(() => location.pathname.includes("/app/nuevo/reporte"));
  await sleep(700);
  const activo = await p.evaluate(() => [...document.querySelectorAll("aside nav a")].filter((a) => a.querySelector("span.absolute")).map((a) => a.textContent.trim()));
  ok((await volver()) === "Volver al documento RT-007-26" && (await titulo()) === "Continuar reporte técnico" && activo.join() === "Documentos", "el editor ofrece «Volver al documento», título «Continuar …» y Documentos activo");
  await clic(p, "Guardar borrador");
  await esperar(() => location.pathname.includes("/app/documentos/ver"));
  await sleep(600);
  ok((await texto()).includes("Borrador guardado"), "guardar regresa al detalle con el aviso");
  ok((await atras()) === "/app/documentos", "«atrás» tras guardar va a la lista, no a otra copia del detalle");
  await clic(p, "RT-007-26", "a");
  await esperar(() => location.search.includes("id=d-rt-5"));
  await sleep(400);
  await clic(p, "Editar");
  await esperar(() => location.pathname.includes("/app/nuevo/reporte"));
  await sleep(600);
  await clic(p, "Volver al documento", "a");
  await esperar(() => location.pathname.includes("/app/documentos/ver"));
  await sleep(400);
  ok((await atras()) === "/app/documentos", "cancelar con «Volver» tampoco deja el editor en el historial");

  // 3. Proyectos: editar y guardar, crear y cancelar
  await comoUsuario(p, "u-adm");
  await p.goto(`${BASE}/app/proyectos`, { waitUntil: "networkidle0" });
  await sleep(500);
  await clic(p, "PRY-002-26", "a");
  await esperar(() => location.search.includes("id=p-2"));
  await sleep(500);
  await clic(p, "Editar", "a");
  await esperar(() => location.pathname.includes("/editar"));
  await sleep(500);
  ok((await titulo()) === "Editar proyecto" && (await volver()) === "Volver al proyecto PRY-002-26", "editar proyecto: título y «Volver al proyecto»");
  await clic(p, "Guardar proyecto");
  await esperar(() => location.pathname.includes("/proyectos/ver"));
  ok((await atras()) === "/app/proyectos", "guardar el proyecto no duplica el detalle en el historial");
  await clic(p, "Nuevo proyecto", "a");
  await esperar(() => location.pathname.includes("/editar"));
  await sleep(500);
  ok((await titulo()) === "Nuevo proyecto", "el título dice «Nuevo proyecto»");
  await clic(p, "Cancelar", "a");
  await esperar(() => location.pathname === "/app/proyectos");
  await sleep(300);
  ok((await atras()) !== "/app/proyectos/editar", "cancelar un proyecto nuevo no deja el formulario en el historial");

  // 4. «Volver» respeta el origen: revisión, cuenta de cobro, documento → equipo, documento → cuenta, tablero
  await p.goto(`${BASE}/app/revision`, { waitUntil: "networkidle0" });
  await sleep(400);
  await clic(p, "RT-008-26", "a");
  await esperar(() => location.pathname.includes("/documentos/ver"));
  await sleep(400);
  ok((await volver()) === "Volver a Revisión", "un documento abierto desde Revisión vuelve a Revisión");
  await clic(p, "Aprobar");
  await sleep(400);
  await atras();
  ok(ruta() === "/app/revision" && !(await texto()).split("Aprobados pendientes")[0].includes("RT-008-26"), "«atrás» tras aprobar regresa a la bandeja, ya sin el documento");
  await p.goForward({ waitUntil: "networkidle0" });
  await sleep(400);
  ok((await p.evaluate(() => document.querySelector("h1").innerText)).includes("Aprobado"), "«adelante» muestra el documento aprobado, sin acciones de revisión");
  await p.goto(`${BASE}/app/cobros/ver?id=cc-1`, { waitUntil: "networkidle0" });
  await sleep(400);
  await clic(p, "RT-002-26", "a");
  await esperar(() => location.pathname.includes("/documentos/ver"));
  await sleep(400);
  ok((await volver()) === "Volver a la cuenta CC-001-26", "un soporte abierto desde la cuenta vuelve a la cuenta");
  await p.goto(`${BASE}/app/documentos/ver?id=d-rt-clay`, { waitUntil: "networkidle0" });
  await sleep(400);
  await clic(p, "Cámara 4", "a");
  await esperar(() => location.pathname.includes("/equipos/ver"));
  await sleep(400);
  ok((await volver()) === "Volver al documento RT-001-26", "un equipo abierto desde el documento vuelve al documento");
  await p.goto(`${BASE}/app/documentos/ver?id=d-rt-2`, { waitUntil: "networkidle0" });
  await sleep(400);
  await clic(p, "Crear cuenta de cobro");
  await esperar(() => location.pathname.includes("/cobros/nueva"));
  await sleep(500);
  await clic(p, "Volver al documento RT-004-26", "a");
  await esperar(() => location.pathname.includes("/documentos/ver"));
  await sleep(300);
  ok((await atras()) !== "/app/cobros/nueva", "la cuenta abierta desde el reporte vuelve al reporte sin dejar el formulario atrás");
  await p.goto(`${BASE}/app`, { waitUntil: "networkidle0" });
  await sleep(500);
  await clic(p, "RT-", "main a");
  await esperar(() => location.pathname.includes("/documentos/ver"));
  await sleep(300);
  ok((await volver()) === "Volver al Tablero", "un documento abierto desde el tablero vuelve al tablero");

  // 5. Equipo nuevo: título y cancelar sin dejar el formulario; URL de una cuenta emitida en el editor
  await p.goto(`${BASE}/app/equipos?cliente=c-clay`, { waitUntil: "networkidle0" });
  await sleep(400);
  await clic(p, "Nuevo equipo", "a");
  await esperar(() => location.search.includes("nuevo=1"));
  await sleep(500);
  ok((await titulo()) === "Nuevo equipo", "el título dice «Nuevo equipo»");
  await clic(p, "Cancelar");
  await esperar(() => location.pathname === "/app/equipos");
  await sleep(300);
  ok(!(await atras()).includes("nuevo=1"), "cancelar un equipo nuevo no deja el formulario en el historial");
  await p.goto(`${BASE}/app/cobros/nueva?id=cc-1`, { waitUntil: "networkidle0" });
  await sleep(400);
  ok((await texto()).includes("Esta cuenta de cobro no se puede editar") && (await texto()).includes("Ver la cuenta CC-001-26"), "una cuenta ya emitida no abre un formulario en blanco por URL");

  // 6. Modales y doble clic: rechazo con Esc y toque fuera; duplicar una sola vez
  await comoUsuario(p, "u-sup");
  await p.goto(`${BASE}/app/documentos/ver?id=d-rt-7`, { waitUntil: "networkidle0" });
  await sleep(400);
  await clic(p, "Rechazar");
  await p.keyboard.press("Escape");
  await sleep(200);
  const trasEsc = !(await p.$('[role="dialog"]'));
  await clic(p, "Rechazar");
  await p.mouse.click(8, 450);
  await sleep(200);
  ok(trasEsc && !(await p.$('[role="dialog"]')), "el motivo de rechazo se cierra con Esc y con un toque fuera");
  const antes = await p.evaluate((k) => JSON.parse(localStorage.getItem(k)).documentos.length, CLAVE);
  await p.evaluate(() => {
    const el = [...document.querySelectorAll("main button")].find((x) => x.textContent.trim() === "Duplicar");
    el.click();
    el.click();
  });
  await esperar(() => location.pathname.includes("/app/nuevo/reporte"));
  await sleep(600);
  ok((await p.evaluate((k) => JSON.parse(localStorage.getItem(k)).documentos.length, CLAVE)) === antes + 1, "doble clic en «Duplicar» crea una sola copia");

  // 7. Celular: la hoja «Nuevo» trae todo lo que el perfil crea y se cierra con Esc y tocando fuera
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await comoUsuario(p, "u-adm");
  await p.goto(`${BASE}/app/documentos`, { waitUntil: "networkidle0" });
  await sleep(500);
  const abrirNuevo = () => p.evaluate(() => [...document.querySelectorAll("nav button")].find((x) => x.textContent.includes("Nuevo")).click());
  const hoja = () => p.evaluate(() => [...document.querySelectorAll('[aria-label="Nuevo documento"] a')].map((a) => a.textContent.trim()));
  await abrirNuevo();
  await sleep(300);
  const adm = await hoja();
  ok(["Reporte técnico", "Permiso de trabajo", "Legalización de gastos", "Cotización", "Proyecto", "Cuenta de cobro", "Equipo"].every((t) => adm.some((x) => x.startsWith(t))), "la hoja «Nuevo» del administrador incluye formatos, proyecto, cuenta de cobro y equipo");
  await p.keyboard.press("Escape");
  await sleep(200);
  const cerrada = !(await p.$('[aria-label="Nuevo documento"]'));
  await comoUsuario(p, "u-tec1");
  await p.reload({ waitUntil: "networkidle0" });
  await sleep(500);
  await abrirNuevo();
  await sleep(300);
  const tec = await hoja();
  await p.touchscreen.tap(195, 60);
  await sleep(300);
  ok(cerrada && !(await p.$('[aria-label="Nuevo documento"]')), "la hoja «Nuevo» se cierra con Esc y tocando fuera");
  ok(tec.some((x) => x.startsWith("Equipo")) && !tec.some((x) => x.startsWith("Proyecto") || x.startsWith("Cuenta de cobro") || x.startsWith("Cotización")), "la hoja del técnico no ofrece proyecto, cotización ni cuenta de cobro");
  await p.close();
}

/** Responde el paso actual del asistente: la sugerencia con ese texto o, si no hay, lo escribe. */
async function responder(p, texto) {
  await sleep(60);
  const hecho = await p.evaluate((t) => {
    const b = [...document.querySelectorAll("main form button[type=button]")].find((x) => x.textContent.trim() === t);
    if (b) b.click();
    return !!b;
  }, texto);
  if (!hecho) {
    await p.type("main form input:not([type=file])", texto);
    await p.keyboard.press("Enter");
  }
  await sleep(350);
}

/** Edita un campo de la plantilla en línea (clic en el texto, reemplaza y Enter). */
async function editarCampo(p, etiqueta, valor) {
  await p.evaluate((l) => document.querySelector(`.doc-print [role=button][aria-label="${l}"]`).click(), etiqueta);
  await sleep(150);
  await p.evaluate((l) => {
    const i = document.querySelector(`.doc-print input[aria-label="${l}"]`);
    i.focus();
    i.select();
  }, etiqueta);
  await p.keyboard.type(valor);
  await p.keyboard.press("Enter");
  await sleep(300);
}

/**
 * Pedidos de Magno en campo (técnico desde el celular): firma del cliente en sitio,
 * retirar un envío para corregirlo, cámara o galería y clientes nuevos al directorio.
 */
async function campo(b, errores) {
  console.log("\n— Campo: firma del cliente en sitio, retirar para corregir, galería y clientes nuevos");
  const p = await nuevaPagina(b, errores);
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto(`${BASE}/acceso`, { waitUntil: "networkidle0" });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: "networkidle0" });
  await clic(p, "Técnico de campo");
  await p.waitForFunction(() => location.pathname.includes("/app/nuevo/reporte"));
  await sleep(800);
  const texto = () => p.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
  const h1 = () => p.evaluate(() => document.querySelector("h1").innerText);
  const estado = () => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), CLAVE);
  const ir = async (ruta, ms = 600) => {
    await p.goto(BASE + ruta, { waitUntil: "networkidle0" });
    await sleep(ms);
  };
  const codigoActual = () => p.evaluate(() => document.querySelector("h1 .font-mono")?.textContent ?? "");
  const idActual = () => new URL(p.url()).searchParams.get("id");

  /** Diligencia un reporte en el asistente hasta la firma del cliente y lo envía (o lo guarda). */
  async function reporte({ cliente, contacto = "Ing. Daniel Ortega", firmaCliente = false, enviar = true, alFotos }) {
    await ir("/app/nuevo/reporte", 800);
    await responder(p, cliente);
    await clic(p, "Sin proyecto");
    await clic(p, "Correctivo");
    await clic(p, String(new Date().getFullYear()));
    await clic(p, "08:00");
    await clic(p, "10:00");
    await responder(p, contacto);
    await clic(p, "Reparación fibra óptica");
    await clic(p, "Continuar sin equipos");
    await clic(p, "Redactar borrador");
    await clic(p, "Enviar", "form button");
    await clic(p, "Programar mantenimiento");
    if (alFotos) await alFotos();
    else await clic(p, "Continuar sin fotos");
    await clic(p, "Andrés Camacho Ruiz");
    await clic(p, "Firmar ahora");
    await firmar(p);
    await clic(p, "Continuar");
    let nombreFirma = null;
    if (firmaCliente) {
      await clic(p, "El cliente firma ahora");
      ok((await p.evaluate(() => document.querySelector("[role=dialog]")?.innerText ?? "")).includes("recibido a satisfacción"), "el pad dice «Firma del cliente · recibido a satisfacción»");
      await firmar(p);
      nombreFirma = await p.evaluate(() => document.querySelector('input[aria-label="Nombre de quien firma"]')?.value ?? "");
      await clic(p, "Continuar");
    } else {
      await clic(p, "El cliente firma después");
    }
    await clic(p, enviar ? "Enviar a revisión" : "Guardar borrador");
    await p.waitForFunction(() => location.pathname.includes("/app/documentos/ver"), { timeout: 15000 });
    await sleep(600);
    return nombreFirma;
  }

  // 1. Cámara o galería: dos botones; la galería sin «capture» (en el celular ofrece la fototeca)
  const ilegible = path.join(os.tmpdir(), "fd-foto-ilegible.heic");
  fs.writeFileSync(ilegible, "esto no es una imagen");
  let botones = null;
  const nombreFirma = await reporte({
    cliente: "Ladrillera Arcillas del Caribe",
    firmaCliente: true,
    alFotos: async () => {
      botones = await p.evaluate(() => {
        const ins = [...document.querySelectorAll("input[type=file]")].filter((i) => i.closest("label")?.textContent.includes("Galería") || i.closest("label")?.textContent.includes("Tomar foto"));
        const cam = ins.find((i) => i.closest("label").textContent.includes("Tomar foto"));
        const gal = ins.find((i) => i.closest("label").textContent.includes("Galería"));
        return { cam: cam?.getAttribute("capture"), galCapture: gal?.hasAttribute("capture"), galMultiple: gal?.multiple, galAccept: gal?.accept, galLabel: gal?.getAttribute("aria-label") };
      });
      const galeria = await p.$('input[aria-label="Elegir de la galería o archivos: fotos del registro fotográfico"]');
      await galeria.uploadFile(ilegible);
      await p.waitForFunction(() => document.body.innerText.includes("No se pudo leer la imagen"), { timeout: 15000 }).catch(() => {});
      ok((await texto()).includes("No se pudo leer la imagen") && (await texto()).includes("HEIC"), "una imagen que no se puede leer (HEIC) muestra un aviso claro en vez de fallar en silencio");
      await galeria.uploadFile(path.join(__dirname, "fixtures/foto.jpg"));
      await p.waitForFunction(() => [...document.querySelectorAll("button")].some((x) => x.textContent.includes("Continuar con 1")), { timeout: 15000 });
      await clic(p, "Continuar con 1");
    },
  });
  ok(botones && botones.cam === "environment" && botones.galCapture === false && botones.galMultiple === true && botones.galAccept === "image/*", `«Tomar foto» abre la cámara y «Galería / archivos» no tiene capture (${JSON.stringify(botones)})`);
  ok(nombreFirma === "Ing. Daniel Ortega", `quien firma se prellena con la persona contactada (${nombreFirma})`);
  const urlFirmado = p.url();
  const codFirmado = await codigoActual();
  let hoja = await p.evaluate(() => document.querySelector(".doc-print").innerText);
  ok((await h1()).includes("En revisión") && hoja.includes("recibido a satisfacción") && hoja.includes("Ing. Daniel Ortega · Ing. sistemas"), `${codFirmado} sale en revisión con la firma del cliente y quien recibe bajo la firma`);

  // 2. La coordinadora lo ve en la bandeja (con la firma en sitio) y al aprobarlo queda cerrado
  await comoUsuario(p, "u-sup");
  await ir("/app/revision");
  ok((await texto()).includes(codFirmado) && (await texto()).includes("Con firma del cliente en sitio"), "la bandeja marca el reporte que trae la firma del cliente en sitio");
  await p.goto(urlFirmado, { waitUntil: "networkidle0" });
  await sleep(600);
  ok((await texto()).includes("al aprobarlo queda cerrado"), "el detalle avisa al revisor que se cierra al aprobar");
  await clic(p, "Aprobar");
  let t = await texto();
  ok((await h1()).includes("Cerrado") && t.includes("Aprobó") && t.includes("Cerrado con la firma del cliente en sitio"), "aprobar un reporte con firma del cliente lo deja cerrado (historial: Aprobó + Cerrado con la firma…)");
  let s = await estado();
  const dFirmado = s.documentos.find((d) => d.codigo === codFirmado);
  ok(s.notificaciones.some((n) => n.para === "u-cli" && n.docId === dFirmado.id && n.texto.includes("firmado en sitio")), "el portal del cliente recibe el reporte firmado en sitio");
  ok(!(await texto()).includes("Pedir firma al cliente"), "un reporte cerrado no ofrece pedir firma por enlace");

  // 3. Sin la firma del cliente: aprobado queda «Aprobado» (portal o enlace como siempre)
  await comoUsuario(p, "u-tec1");
  await reporte({ cliente: "Ladrillera Arcillas del Caribe" });
  const urlSin = p.url();
  const codSin = await codigoActual();
  await comoUsuario(p, "u-sup");
  await p.goto(urlSin, { waitUntil: "networkidle0" });
  await sleep(600);
  await clic(p, "Aprobar");
  ok((await h1()).includes("Aprobado") && (await texto()).includes("Pedir firma al cliente"), `${codSin} sin firma del cliente queda aprobado y se puede pedir la firma por enlace`);
  // Ya aprobado, el técnico no lo retira (solo el rechazo con motivo del revisor lo devuelve)
  await comoUsuario(p, "u-tec1");
  await p.goto(urlSin, { waitUntil: "networkidle0" });
  await sleep(600);
  t = await texto();
  ok(!t.includes("Retirar para corregir") && !t.includes("Editar") && t.includes("Tomar firma del cliente en sitio"), "aprobado: el técnico no lo retira ni lo edita, pero sí puede tomar la firma en sitio");
  await clic(p, "Tomar firma del cliente en sitio");
  await clic(p, "Firmar", "[role=dialog] button");
  await firmar(p);
  t = await texto();
  ok((await h1()).includes("Cerrado") && t.includes("Firma del cliente en sitio"), "la firma en sitio sobre un aprobado lo cierra");

  // 4. Enviado sin la firma: el técnico la toma desde el detalle mientras está en revisión
  await reporte({ cliente: "Ladrillera Arcillas del Caribe" });
  const urlTarde = p.url();
  await clic(p, "Tomar firma del cliente en sitio");
  await p.evaluate(() => {
    const i = document.querySelector("[role=dialog] input");
    i.focus();
  });
  await p.keyboard.down("Control");
  await p.keyboard.press("a");
  await p.keyboard.up("Control");
  await p.keyboard.type("Ing. Carolina Vélez");
  await clic(p, "Firmar", "[role=dialog] button");
  await firmar(p);
  t = await texto();
  ok((await h1()).includes("En revisión") && t.includes("Firma del cliente en sitio") && t.includes("Ing. Carolina Vélez") && !t.includes("Tomar firma del cliente en sitio"), "en revisión, el técnico toma la firma en sitio desde el detalle (historial «Firma del cliente en sitio»)");
  await comoUsuario(p, "u-sup");
  await p.goto(urlTarde, { waitUntil: "networkidle0" });
  await sleep(600);
  await clic(p, "Aprobar");
  ok((await h1()).includes("Cerrado"), "al aprobarlo queda cerrado con esa firma");

  // 5. Retirar para corregir: vuelve a borrador, se edita y se reenvía; el revisor recibe el aviso
  await comoUsuario(p, "u-tec1");
  await reporte({ cliente: "Ladrillera Arcillas del Caribe" });
  const urlRet = p.url();
  const idRet = idActual();
  const codRet = await codigoActual();
  // Doble clic: un solo retiro
  await p.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes("Retirar para corregir"));
    b.click();
    b.click();
  });
  await sleep(600);
  s = await estado();
  let dRet = s.documentos.find((d) => d.id === idRet);
  ok((await h1()).includes("Borrador") && dRet.historial.filter((h) => h.accion === "Retiró el envío para corregir").length === 1, `«Retirar para corregir» devuelve ${codRet} a borrador una sola vez (doble clic)`);
  ok(s.notificaciones.some((n) => n.para === "supervisor" && n.docId === idRet && n.texto.includes("retiró")) && !s.notificaciones.some((n) => n.para === "supervisor" && n.docId === idRet && !n.leida && n.texto.endsWith("a revisión")), "el revisor recibe «retiró … para corregirlo» y desaparece el aviso pendiente de revisión");
  await clic(p, "Editar");
  await p.waitForFunction(() => location.pathname.includes("/app/nuevo/reporte"), { timeout: 15000 });
  await sleep(800);
  await editarCampo(p, "asunto", "Reparación fibra óptica tramo hornos");
  await clic(p, "Enviar a revisión");
  await p.waitForFunction(() => location.pathname.includes("/app/documentos/ver"), { timeout: 15000 });
  await sleep(600);
  s = await estado();
  dRet = s.documentos.find((d) => d.id === idRet);
  ok((await h1()).includes("En revisión") && dRet.datos.asunto === "Reparación fibra óptica tramo hornos", "corregido y reenviado: vuelve a revisión con el cambio");

  // 6. La bandeja del revisor se actualiza sola cuando el autor retira desde otro equipo
  await comoUsuario(p, "u-sup");
  await ir("/app/revision");
  ok((await texto()).includes(codRet), "la bandeja muestra el reporte reenviado");
  const p2 = await nuevaPagina(b, errores);
  await p2.goto(`${BASE}/acceso`, { waitUntil: "networkidle0" });
  // Otra pestaña/equipo deja el reporte retirado (el técnico lo retiró desde su celular)
  await p2.evaluate(
    (k, id) => {
      const st = JSON.parse(localStorage.getItem(k));
      st.documentos = st.documentos.map((d) => (d.id === id ? { ...d, estado: "borrador", historial: [...d.historial, { fecha: "2026-10-27T10:00:00", usuarioId: "u-tec1", accion: "Retiró el envío para corregir" }] } : d));
      st.usuarioId = "u-sup";
      localStorage.setItem(k, JSON.stringify(st));
    },
    CLAVE,
    idRet,
  );
  await sleep(800);
  ok(!(await texto()).includes(codRet), "sin recargar, el reporte retirado sale de la bandeja del revisor");
  // El revisor que lo tenía abierto ve el motivo (gana el retiro) y ya no puede aprobarlo
  await p.goto(urlRet, { waitUntil: "networkidle0" });
  await sleep(600);
  t = await texto();
  ok(t.includes("retiró el envío para corregirlo") && !t.includes("Aprobar"), "el revisor ve que el autor lo retiró y no tiene «Aprobar»");
  await p2.close();

  // 7. Cliente nuevo escrito por el técnico: queda en el directorio y autollena el próximo reporte
  await comoUsuario(p, "u-tec1");
  const antes = (await estado()).clientes.length;
  await reporte({ cliente: "Ferretería El Tornillo", contacto: "Marta Gómez", enviar: false });
  t = await texto();
  ok(t.includes("Guardé «Ferretería El Tornillo» en el directorio de clientes"), "al guardar, avisa «Guardé «Ferretería El Tornillo» en el directorio de clientes»");
  s = await estado();
  const nuevo = s.clientes.find((c) => c.nombre === "Ferretería El Tornillo");
  const dNuevo = s.documentos.find((d) => d.id === idActual());
  ok(s.clientes.length === antes + 1 && nuevo && nuevo.contacto === "Marta Gómez" && dNuevo.clienteId === nuevo.id, "el técnico crea el cliente con lo escrito (contacto) y el reporte queda enlazado");
  // Otra vez con otras mayúsculas, tildes y espacios: no se duplica, autollena y completa lo vacío
  await ir("/app/nuevo/reporte", 800);
  await responder(p, "  ferreteria  el TORNILLO ");
  hoja = await p.evaluate(() => document.querySelector(".doc-print").innerText);
  ok(hoja.includes("Ferretería El Tornillo") && hoja.includes("Marta Gómez"), "escribirlo con otras mayúsculas o sin tildes autollena el cliente del directorio");
  await clic(p, "Sin proyecto");
  await editarCampo(p, "correo", "compras@eltornillo.example");
  await clic(p, "Guardar borrador");
  await p.waitForFunction(() => location.pathname.includes("/app/documentos/ver"), { timeout: 15000 });
  await sleep(600);
  s = await estado();
  const tornillos = s.clientes.filter((c) => c.nombre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes("ferreteria el tornillo"));
  ok(tornillos.length === 1 && tornillos[0].correo === "compras@eltornillo.example" && tornillos[0].contacto === "Marta Gómez", "sin duplicar: se completó el correo que faltaba y se conservó el contacto");
  ok((await texto()).includes("Completé en el directorio los datos que le faltaban"), "avisa qué datos completó en el directorio");
  // Lo que ya tiene el cliente no se sobrescribe desde un formato
  await ir("/app/nuevo/reporte", 800);
  await responder(p, "Ferretería El Tornillo");
  await clic(p, "Sin proyecto");
  await editarCampo(p, "correo", "otro@correo.example");
  await clic(p, "Guardar borrador");
  await p.waitForFunction(() => location.pathname.includes("/app/documentos/ver"), { timeout: 15000 });
  await sleep(600);
  s = await estado();
  ok(s.clientes.find((c) => c.nombre === "Ferretería El Tornillo").correo === "compras@eltornillo.example", "un correo distinto en el formato no sobrescribe el del directorio");

  // 8. Un cliente desactivado no se recrea: se ofrece usarlo (las pruebas aceptan el diálogo)
  await p.evaluate((k) => {
    const st = JSON.parse(localStorage.getItem(k));
    st.clientes = st.clientes.map((c) => (c.id === "c-puerto" ? { ...c, activo: false } : c));
    localStorage.setItem(k, JSON.stringify(st));
  }, CLAVE);
  const nClientes = (await estado()).clientes.length;
  await ir("/app/nuevo/reporte", 900);
  await responder(p, "centro logistico bahia");
  ok((await texto()).includes("está desactivado en el directorio"), "escribir un cliente desactivado avisa que existe (no se crea otro)");
  await clic(p, "Sin proyecto");
  await clic(p, "Guardar borrador");
  await p.waitForFunction(() => location.pathname.includes("/app/documentos/ver"), { timeout: 15000 });
  await sleep(600);
  s = await estado();
  ok(s.clientes.length === nClientes && s.documentos.find((d) => d.id === idActual()).clienteId === "c-puerto", "al aceptar, el documento usa el cliente desactivado sin duplicarlo");

  // 9. El técnico no edita ni elimina clientes; la administración sí los ve en el directorio
  await ir("/app/clientes", 500);
  ok((await texto()).includes("Acceso restringido"), "el técnico no entra al directorio a editar o eliminar clientes");
  await comoUsuario(p, "u-sup");
  await ir("/app/clientes", 500);
  ok((await texto()).includes("Ferretería El Tornillo") && (await texto()).includes("compras@eltornillo.example"), "el cliente creado por el técnico aparece en el directorio de la organización");

  // 10. Retirar o rechazar anula la firma del cliente en sitio (el contenido va a cambiar)
  await comoUsuario(p, "u-tec1");
  await reporte({ cliente: "Ladrillera Arcillas del Caribe", firmaCliente: true });
  const idAnula = idActual();
  const urlAnula = p.url();
  const avisos = [];
  const alDialogo = (d) => avisos.push(d.message());
  p.on("dialog", alDialogo);
  await clic(p, "Retirar para corregir");
  s = await estado();
  let dA = s.documentos.find((d) => d.id === idAnula);
  ok(avisos.some((m) => m.includes("se anula")) && dA.estado === "borrador" && dA.datos.firmaCliente === "" && dA.datos.nombreRecibe === "" && dA.historial.some((h) => h.accion === "Se anuló la firma del cliente (el contenido cambió)"), "retirar avisa y anula la firma del cliente en sitio (y quién recibe)");
  await clic(p, "Enviar a revisión");
  await clic(p, "Tomar firma del cliente en sitio");
  await clic(p, "Firmar", "[role=dialog] button");
  await firmar(p);
  ok((await texto()).includes("cuando se apruebe"), "lo corregido y reenviado se vuelve a firmar en sitio");
  await comoUsuario(p, "u-sup");
  await p.goto(urlAnula, { waitUntil: "networkidle0" });
  await sleep(600);
  await clic(p, "Rechazar");
  ok((await p.evaluate(() => document.querySelector("[role=dialog]").innerText)).includes("se anula"), "el rechazo avisa que se anula la firma del cliente");
  await clic(p, "Falta detallar las recomendaciones", "[role=dialog] button");
  await p.evaluate(() => [...document.querySelectorAll("[role=dialog] button")].find((x) => x.textContent.trim() === "Rechazar").click());
  await sleep(400);
  dA = (await estado()).documentos.find((d) => d.id === idAnula);
  ok(dA.estado === "rechazado" && dA.datos.firmaCliente === "", "rechazar anula la firma del cliente en sitio");
  p.off("dialog", alDialogo);

  // 11. Un nombre que solo se parece se pregunta; si no es el mismo, queda escrito a mano y no se duplica
  await comoUsuario(p, "u-tec1");
  const nAntes = (await estado()).clientes.length;
  await ir("/app/nuevo/reporte", 800);
  await p.evaluate(() => (window.confirm = (m) => ((window.__preguntas = [...(window.__preguntas ?? []), m]), false)));
  await responder(p, "Ferreteria el Tornillo S.A.S.");
  const preguntas = await p.evaluate(() => window.__preguntas ?? []);
  ok(preguntas.some((m) => m.includes("se parece a «Ferretería El Tornillo»")), "«Ferreteria el Tornillo S.A.S.» pregunta si es «Ferretería El Tornillo»");
  ok((await texto()).includes("queda escrito a mano"), "si no es el mismo, el asistente avisa que queda escrito a mano");
  await clic(p, "Sin proyecto");
  await clic(p, "Guardar borrador");
  await p.waitForFunction(() => location.pathname.includes("/app/documentos/ver"), { timeout: 15000 });
  await sleep(600);
  s = await estado();
  ok(s.clientes.length === nAntes && !s.documentos.find((d) => d.id === idActual()).clienteId, "no se enlaza al cliente parecido ni se crea un duplicado (y no se vuelve a preguntar al guardar)");

  // 12. Cambiar a mano el cliente elegido en el formato quita los datos que ese cliente había llenado
  await ir("/app/nuevo/reporte", 800);
  await clic(p, "Ladrillera Arcillas del Caribe");
  await clic(p, "PRY-001-26");
  await editarCampo(p, "cliente", "Distribuidora La Ceiba");
  const hojaN = await p.evaluate(() => document.querySelector(".doc-print").innerText);
  ok(!hojaN.includes("sistemas@arcillasdelcaribe.example") && !hojaN.includes("Ing. Daniel Ortega") && !hojaN.includes("Zona Industrial") && !hojaN.includes("PRY-001-26"), "renombrar el cliente quita correo, contacto, dirección y proyecto del anterior");
  ok((await texto()).includes("Quité los datos de «Ladrillera Arcillas del Caribe»"), "avisa qué se quitó del cliente anterior");
  await clic(p, "Guardar borrador");
  await p.waitForFunction(() => location.pathname.includes("/app/documentos/ver"), { timeout: 15000 });
  await sleep(600);
  const ceiba = (await estado()).clientes.find((c) => c.nombre === "Distribuidora La Ceiba");
  ok(ceiba && !ceiba.correo && !ceiba.contacto && !ceiba.direccion, "el cliente nuevo no hereda los datos del anterior");
  await p.close();
}

async function impresion(b, errores) {
  console.log("\n— Impresión y PDF (/imprimir)");
  const p = await nuevaPagina(b, errores);
  // window.print abriría el diálogo: se cuenta en vez de abrirlo
  await p.evaluateOnNewDocument(() => {
    window.__impresiones = 0;
    window.print = () => window.__impresiones++;
  });
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await p.goto(`${BASE}/acceso`, { waitUntil: "networkidle0" });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: "networkidle0" });
  await clic(p, "Administrador");
  await p.waitForFunction(() => location.pathname.startsWith("/app"));
  await sleep(600);
  const hoja = () => p.evaluate(() => [...document.querySelectorAll(".doc-print")].map((h) => h.innerText.replace(/\s+/g, " ")).join(" | "));
  const lista = () => p.waitForSelector("[data-impresion-lista]", { timeout: 20000 });
  const enFlujo = async () => {
    await p.emulateMediaType("print");
    const r = await p.evaluate(() => {
      const malos = [];
      for (const h of document.querySelectorAll(".doc-print"))
        for (let e = h; e; e = e.parentElement) {
          const cs = getComputedStyle(e);
          if (["absolute", "fixed"].includes(cs.position) || cs.overflowX !== "visible" || cs.overflowY !== "visible") malos.push(`${e.tagName}.${e.className}`.slice(0, 80));
        }
      const z = document.querySelector(".doc-zona");
      return { malos, zona: z && getComputedStyle(z).position };
    });
    await p.emulateMediaType("screen");
    return r;
  };

  // 1. Cotización guardada: el botón PDF abre /imprimir con el consecutivo como nombre del archivo
  await p.goto(`${BASE}/app/documentos/ver?id=d-cot-1`, { waitUntil: "networkidle0" });
  await sleep(500);
  const codigo = await p.evaluate(() => document.querySelector("h1 .font-mono").textContent.trim());
  const enDetalle = await hoja();
  await clic(p, "PDF");
  await p.waitForFunction(() => location.pathname.startsWith("/imprimir"));
  await lista();
  await sleep(300);
  ok((await p.title()).startsWith(`${codigo} · Cotización`), `el título (nombre del PDF) empieza por el consecutivo ${codigo}`);
  const enImpresion = await hoja();
  ok(enImpresion === enDetalle && enImpresion.includes("Ladrillera Arcillas del Caribe") && /Total \$ [\d.]+/.test(enImpresion) && enImpresion.includes("Aceptación del cliente"), "la hoja trae el cliente, los totales y la aceptación, igual que el detalle");
  ok((await p.evaluate(() => window.__impresiones)) === 1, "imprime automáticamente una sola vez");
  ok((await p.evaluate(() => !document.querySelector("aside, nav") && [...document.querySelectorAll("button")].some((x) => x.textContent.includes("Imprimir / Guardar PDF")))), "sin el shell del aplicativo y con «Imprimir / Guardar PDF»");
  const f = await enFlujo();
  ok(f.zona === "static" && f.malos.length === 0, `en papel, ningún contenedor de la hoja es absoluto ni recorta${f.malos.length ? `: ${f.malos.join(", ")}` : ""}`);
  await clic(p, "Volver");
  await p.waitForFunction(() => location.pathname.startsWith("/app/documentos/ver"));
  ok(new URL(p.url()).searchParams.get("id") === "d-cot-1", "«Volver» regresa al detalle");

  // 2. Borrador sin guardar desde el generador: se imprime lo diligenciado
  await p.goto(`${BASE}/app/nuevo/cotizacion`, { waitUntil: "networkidle0" });
  await sleep(800);
  await p.evaluate(() => {
    const s = document.querySelector('section[aria-label="Cliente y proyecto"] select');
    const o = [...s.options].find((x) => x.textContent.includes("Ladrillera Arcillas del Caribe"));
    s.value = o.value;
    s.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await sleep(300);
  await p.evaluate(() => [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Formato")?.click());
  await sleep(300);
  await clic(p, "Imprimir / PDF");
  await p.waitForFunction(() => location.pathname.startsWith("/imprimir"));
  await lista();
  await sleep(300);
  const borrador = await hoja();
  ok(new URL(p.url()).searchParams.has("borrador") && borrador.includes("Ladrillera Arcillas del Caribe"), "un borrador sin guardar imprime lo que se diligenció");
  ok((await p.evaluate(() => document.body.innerText)).includes("Borrador sin guardar"), "avisa que el borrador no está guardado");
  ok(/^COT-borrador-\d{4}-\d{2}-\d{2}/.test(await p.title()), "el PDF del borrador se llama COT-borrador-<fecha>");
  const fb = await enFlujo();
  ok(fb.zona === "static" && fb.malos.length === 0, "el borrador también queda en el flujo en papel");
  await clic(p, "Volver");
  await p.waitForFunction(() => location.pathname.startsWith("/app/nuevo/cotizacion"));
  await sleep(800);
  ok((await p.evaluate(() => document.querySelector('section[aria-label="Cliente y proyecto"] select').selectedOptions[0].textContent)).includes("Ladrillera"), "al volver, el generador conserva lo diligenciado");

  // 3. Cuenta de cobro
  await p.goto(`${BASE}/app/cobros/ver?id=cc-1`, { waitUntil: "networkidle0" });
  await sleep(500);
  const cc = await p.evaluate(() => document.querySelector("h1 .font-mono").textContent.trim());
  await clic(p, "PDF");
  await p.waitForFunction(() => location.pathname.startsWith("/imprimir"));
  await lista();
  ok((await p.title()).startsWith(`${cc} · Cuenta de cobro`) && (await hoja()).includes("TOTAL A PAGAR"), `la cuenta de cobro imprime con el título ${cc}`);
  await p.close();
}

async function comercial(b, errores) {
  console.log("\n— Comercial solo para la administración: cotizaciones y cuentas de cobro (técnico y SST no las ven)");
  const p = await nuevaPagina(b, errores);
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto(`${BASE}/acceso`, { waitUntil: "networkidle0" });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: "networkidle0" });
  await clic(p, "Técnico de campo");
  await p.waitForFunction(() => location.pathname.includes("/app"));
  await sleep(900);
  const texto = () => p.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
  const principal = () => p.evaluate(() => document.querySelector("main").innerText.replace(/\s+/g, " "));
  const ir = async (r, ms = 500) => {
    await p.goto(`${BASE}${r}`, { waitUntil: "networkidle0" });
    await sleep(ms);
  };
  const dirFotos = process.env.CAPTURAS || "";
  const foto = async (n) => {
    if (dirFotos) await p.screenshot({ path: path.join(dirFotos, `${n}.png`), fullPage: true });
  };

  // Avisos comerciales dirigidos a su rol (p. ej. de otra pestaña): el técnico y SST no los ven
  await p.evaluate((k) => {
    const st = JSON.parse(localStorage.getItem(k));
    const n = (id, para, texto, extra) => ({ id, para, texto, fecha: "2026-10-21T08:00:00", leida: false, ...extra });
    st.notificaciones.unshift(
      n("n-prueba-1", "supervisor", "Prueba: cotización COT-002-26 por revisar", { docId: "d-cot-1" }),
      n("n-prueba-2", "tecnico", "Prueba: cotización COT-003-26", { docId: "d-cot-2" }),
      n("n-prueba-3", "supervisor", "Prueba: cuenta de cobro CC-002-26", { cuentaId: "cc-2" }),
    );
    localStorage.setItem(k, JSON.stringify(st));
  }, CLAVE);

  // 1. El técnico y el Coordinador SST: nada comercial en menús, tablero, listados, proyectos, avisos ni por URL
  for (const [uid, quien] of [["u-tec1", "el técnico"], ["u-sup", "SST"]]) {
    await comoUsuario(p, uid);
    await ir("/app", 800);
    const menu = await p.evaluate(() => [...document.querySelectorAll("aside a")].map((a) => a.getAttribute("href")));
    ok(!menu.some((h) => h.includes("/app/nuevo/cotizacion") || h.startsWith("/app/cobros")) && menu.includes("/app/nuevo/gasto"), `${quien}: sin «Nueva cotización» ni «Cuentas de cobro» en el menú (sí legaliza gastos)`);
    const tablero = await principal();
    ok(!/Cartera por cobrar|Cobrado|Cotizaci/.test(tablero) && !(await p.evaluate(() => [...document.querySelectorAll("main a")].some((a) => a.getAttribute("href") === "/app/nuevo/cotizacion"))), `${quien}: el tablero no muestra cotizaciones, cartera ni cobrado`);
    await foto(`${uid}-tablero`);
    await p.click('header button[aria-label="Notificaciones"]');
    await sleep(300);
    ok(!/cotizaci|cuenta de cobro/i.test(await p.evaluate(() => document.querySelector("header").innerText)), `${quien}: ningún aviso de cotizaciones o cuentas de cobro`);
    await p.keyboard.press("Escape");
    for (const r of ["/app/nuevo/cotizacion", "/app/nuevo/cotizacion?id=d-cot-2", "/app/nuevo/cotizacion?proyecto=p-1", "/app/cobros", "/app/cobros/nueva", "/app/cobros/ver?id=cc-2", "/app/cobros/nueva?proyecto=p-1&cliente=c-clay"]) {
      await ir(r, 400);
      ok((await principal()).includes("Acceso restringido"), `${quien}: ${r} muestra «Acceso restringido»`);
      if (r === "/app/nuevo/cotizacion") await foto(`${uid}-url-cotizacion`);
    }
    for (const id of ["d-cot-0", "d-cot-1", "d-cot-2"]) {
      await ir(`/app/documentos/ver?id=${id}`, 400);
      ok((await principal()).includes("no disponible"), `${quien}: la cotización ${id} por URL no está disponible`);
    }
    await ir("/app/documentos");
    const docs = await principal();
    ok(!docs.includes("COT-") && !docs.includes("Cotizaciones") && docs.includes("RT-"), `${quien}: Documentos sin cotizaciones (sí reportes)`);
    await ir("/app/documentos?q=COT-0");
    ok((await p.evaluate(() => document.querySelectorAll("tbody tr").length)) === 0, `${quien}: buscar «COT-0» no encuentra nada`);
    await ir("/app/proyectos");
    const lista = await principal();
    ok(!/Cotizado|Cobrado|cotizaci|cuentas? de cobro/i.test(lista), `${quien}: la lista de proyectos no muestra cotizado, cobrado ni cotizaciones`);
    await ir("/app/proyectos/ver?id=p-1");
    const pestanas = await p.evaluate(() => [...document.querySelectorAll("[role=tab]")].map((t) => t.textContent));
    const det = await principal();
    ok(!pestanas.some((t) => /Cotizaciones|Cuentas de cobro/.test(t)) && pestanas.some((t) => t.startsWith("Reportes")), `${quien}: el proyecto no tiene pestañas de cotizaciones ni cuentas de cobro`);
    ok(!/Cotizado|Cobrado|Facturado|COT-|CC-0/.test(det) && !(await p.evaluate(() => [...document.querySelectorAll("main a")].some((a) => /nuevo\/cotizacion|cobros\/nueva/.test(a.getAttribute("href") || "")))), `${quien}: el proyecto no muestra totales comerciales ni «Nueva cotización» / «Cuenta de cobro»`);
    await foto(`${uid}-proyecto`);
    // Un reporte ya cobrado (RT de cc-2) y uno aprobado sin cobrar: sin banner ni botón de cobro
    for (const id of ["d-rt-3", "d-rt-2"]) {
      await ir(`/app/documentos/ver?id=${id}`, 400);
      const t = await principal();
      if (!t.includes("no disponible")) ok(!t.includes("ya se cobró") && !t.includes("Crear cuenta de cobro"), `${quien}: el reporte ${id} no muestra «ya se cobró» ni «Crear cuenta de cobro»`);
    }
    if (uid === "u-sup") {
      await ir("/app/revision");
      ok(!(await principal()).includes("COT-"), "SST: la bandeja de revisión no trae cotizaciones");
    }
    // Celular: la hoja «Nuevo» no ofrece cotización ni cuenta de cobro
    await p.setViewport({ width: 390, height: 844, isMobile: true });
    await ir("/app");
    await p.evaluate(() => [...document.querySelectorAll("nav button")].find((x) => x.textContent.includes("Nuevo")).click());
    await sleep(300);
    const hoja = await p.evaluate(() => [...document.querySelectorAll('[aria-label="Nuevo documento"] a')].map((a) => a.textContent.trim()));
    ok(hoja.some((x) => x.startsWith("Legalización de gastos")) && !hoja.some((x) => x.startsWith("Cotización") || x.startsWith("Cuenta de cobro")), `${quien}: la hoja «Nuevo» del celular no ofrece cotización ni cuenta de cobro`);
    await foto(`${uid}-nuevo-celular`);
    await p.keyboard.press("Escape");
    await p.setViewport({ width: 1440, height: 900 });
  }

  // 2. La administración: crea la cotización y la aprueba y envía en un solo paso (sin revisor aparte)
  // Cambio de rol por el menú de perfil, como el usuario: escribir el almacenamiento con la app abierta
  // compite con el guardado de la propia app y en producción a veces gana la app
  await ir("/app", 600);
  await p.click('header button[aria-haspopup="menu"]');
  await sleep(300);
  await p.evaluate(() => [...document.querySelectorAll("[role=menuitem]")].find((x) => x.textContent.includes("Administrador")).click());
  await p.waitForFunction(() => document.querySelector('header button[aria-haspopup="menu"]')?.innerText.includes("Administrador"), { timeout: 15000 });
  await ir("/app", 800);
  const menuAdm = await p.evaluate(() => [...document.querySelectorAll("aside a")].map((a) => a.getAttribute("href")));
  ok(menuAdm.includes("/app/nuevo/cotizacion") && menuAdm.includes("/app/cobros"), "la administración ve «Nueva cotización» y «Cuentas de cobro»");
  ok(/Cartera por cobrar/.test(await principal()), "la administración ve la cartera y lo cobrado en el tablero");
  await foto("u-adm-tablero");
  await ir("/app/nuevo/cotizacion?proyecto=p-1", 900);
  await clic(p, "Ladrillera Arcillas del Caribe");
  await clic(p, "PRY-001-26");
  await clic(p, "Instalación de cámaras IP");
  await clic(p, "Instalación de cámara IP");
  await clic(p, "Continuar con 1");
  await clic(p, "Omitir");
  await clic(p, String(new Date().getFullYear()));
  await clic(p, "Contado contra entrega");
  await clic(p, "Inmediato");
  await clic(p, "12 meses");
  await clic(p, "Omitir");
  await clic(p, "Ver resumen");
  ok(!(await p.evaluate(() => [...document.querySelectorAll("button")].some((x) => x.textContent.includes("Enviar a revisión")))), "la cotización no se «envía a revisión»");
  await clic(p, "Aprobar y enviar al cliente");
  await p.waitForFunction(() => location.pathname.includes("/app/documentos/ver"), { timeout: 15000 });
  await sleep(600);
  const urlCot = p.url();
  const h1 = await p.evaluate(() => document.querySelector("h1").innerText);
  ok(h1.includes("COT-004-26") && h1.includes("Aprobada") && (await texto()).includes("Aprobó y envió al cliente"), "la administración aprueba y envía la cotización COT-004-26 en un paso");
  await foto("u-adm-cotizacion");
  await ir("/app/proyectos/ver?id=p-1");
  const pestAdm = await p.evaluate(() => [...document.querySelectorAll("[role=tab]")].map((t) => t.textContent));
  ok(pestAdm.some((t) => t.startsWith("Cotizaciones")) && pestAdm.some((t) => t.startsWith("Cuentas de cobro")) && (await principal()).includes("Cotizado"), "la administración ve en el proyecto cotizaciones, cuentas de cobro y lo cotizado");
  await foto("u-adm-proyecto");
  // SST no la ve aunque tenga el enlace
  await comoUsuario(p, "u-sup");
  await p.goto(urlCot, { waitUntil: "networkidle0" });
  await sleep(400);
  ok((await principal()).includes("no disponible"), "SST no abre la cotización nueva por su enlace");

  // 3. El cliente: le llega a su portal, la acepta y la firma
  await comoUsuario(p, "u-cli");
  await ir("/app", 600);
  await p.click('header button[aria-label="Notificaciones"]');
  await sleep(300);
  ok((await p.evaluate(() => document.querySelector("header").innerText)).includes("COT-004-26"), "el cliente recibe el aviso de la cotización COT-004-26");
  await p.keyboard.press("Escape");
  await p.goto(urlCot, { waitUntil: "networkidle0" });
  await sleep(600);
  await clic(p, "Aceptar y firmar");
  await firmar(p);
  ok((await p.evaluate(() => document.querySelector("h1").innerText)).includes("Aceptada"), "el cliente acepta la cotización con su firma");
  await ir("/app/documentos");
  const docsCli = await principal();
  ok(docsCli.includes("COT-004-26") && docsCli.includes("COT-002-26") && !docsCli.includes("COT-003-26"), "el cliente ve sus cotizaciones aprobadas o aceptadas (no los borradores)");

  // 4. La administración crea y emite una cuenta de cobro desde un reporte; el cliente la ve
  await comoUsuario(p, "u-adm");
  await ir("/app/documentos/ver?id=d-rt-2", 500);
  await clic(p, "Crear cuenta de cobro");
  await p.waitForFunction(() => location.pathname.includes("/app/cobros/nueva"));
  await sleep(600);
  await p.type('input[aria-label="Valor unitario"]', "950000");
  await clic(p, "Emitir");
  await p.waitForFunction(() => location.pathname.includes("/app/cobros/ver"), { timeout: 15000 });
  await sleep(600);
  const cc = await p.evaluate(() => document.querySelector("h1 .font-mono, h1").textContent.match(/CC-\d+-\d+/)?.[0] ?? "");
  ok(cc.startsWith("CC-") && (await texto()).includes("Emitida"), `la administración emite la cuenta de cobro ${cc}`);
  await ir("/app/documentos/ver?id=d-rt-2", 400);
  ok((await principal()).includes("ya se cobró en la cuenta de cobro"), "la administración ve el reporte enlazado a su cuenta");
  // SST ve el reporte, pero no el enlace a la cuenta
  await comoUsuario(p, "u-sup");
  await ir("/app/documentos/ver?id=d-rt-2", 400);
  const rSst = await principal();
  ok(rSst.includes("RT-004-26") && !rSst.includes("ya se cobró") && !rSst.includes(cc), "SST ve el reporte cobrado sin «ya se cobró en CC-…»");
  // El cliente del reporte (Horizonte Azul) ve su cuenta emitida
  await comoUsuario(p, "u-cli");
  await ir("/app", 500);
  await p.click('header button[aria-haspopup="menu"]');
  await sleep(300);
  await p.select("header select", "c-tango");
  await sleep(900);
  await ir("/app/cobros", 500);
  ok((await principal()).includes(cc), `el cliente ve su cuenta emitida ${cc}`);
  await p.close();
}

/**
 * Variantes de formato (pedido de Magno): el reporte de un proyecto «Servicios Fortox» sale
 * en el formato de FORTOX (vista previa, guardado, detalle e /imprimir); uno de SOTEC sale
 * como SOTEC; cambiar el proyecto cambia la vista previa; cambiar después el tipo del proyecto
 * no cambia lo guardado; el cliente con «Formato por defecto» lo usa sin proyecto.
 * Capturas en VARIANTES_CAPTURAS (carpeta) si se define.
 */
async function variantes(b, errores) {
  console.log("\n— Variantes de formato (Servicios Fortox)");
  const p = await nuevaPagina(b, errores);
  await p.evaluateOnNewDocument(() => {
    window.__impresiones = 0;
    window.print = () => window.__impresiones++;
  });
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto(`${BASE}/acceso`, { waitUntil: "networkidle0" });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: "networkidle0" });
  const capturas = process.env.VARIANTES_CAPTURAS;
  const foto = async (nombre) => capturas && p.screenshot({ path: path.join(capturas, `${nombre}.png`), fullPage: false });
  const hoja = () => p.evaluate(() => [...document.querySelectorAll(".doc-print")].map((h) => h.innerText.replace(/\s+/g, " ")).join(" | "));
  const chip = () => p.evaluate(() => document.querySelector("[data-chip-variante]")?.textContent.trim() ?? "");
  const vista = () =>
    p.evaluate(() => {
      const h = document.querySelector(".doc-print .hdr");
      return { logo: Boolean(document.querySelector(".doc-print [data-logo-texto=fortox]")), fondo: h ? getComputedStyle(h).backgroundColor : "" };
    });
  const elegirEnFormulario = (indice, texto) =>
    p.evaluate(
      (i, t) => {
        const s = document.querySelectorAll('section[aria-label="Cliente y proyecto"] select')[i];
        const o = [...s.options].find((x) => x.textContent.includes(t));
        s.value = o.value;
        s.dispatchEvent(new Event("change", { bubbles: true }));
      },
      indice,
      texto,
    );
  const verde = "rgb(146, 208, 80)";

  // 1. El técnico elige en el asistente el cliente y el proyecto «Servicios Fortox»
  await clic(p, "Técnico de campo");
  await p.waitForFunction(() => location.pathname.includes("/app/nuevo/reporte"));
  await sleep(800);
  ok((await chip()) === "Formato: Servicios SOTEC", "el generador arranca con «Formato: Servicios SOTEC»");
  await clic(p, "Centro Comercial Mirador de la Bahía");
  await clic(p, "PRY-012-25");
  await sleep(300);
  let h = await hoja();
  let v = await vista();
  ok((await chip()).startsWith("Formato: Servicios Fortox"), "al elegir el proyecto Servicios Fortox el chip dice «Formato: Servicios Fortox»");
  ok(v.logo && h.includes("FORTOX") && h.includes("Código por confirmar") && !h.includes("FO-GSST-22"), "la vista previa trae el encabezado de FORTOX (logo de texto, código por confirmar)");
  ok(v.fondo && v.fondo !== verde, "las franjas del formato cambian de color (no el verde de SOTEC)");
  ok(h.includes("SOTEC para FORTOX") && !h.includes("propiedad de SOTEC"), "el pie es el de la variante FORTOX");
  ok((await p.evaluate(() => document.body.innerText)).includes("Formato: Servicios Fortox. El reporte técnico sale con el encabezado de FORTOX"), "el asistente avisa el cambio de formato");
  await foto("generador-fortox-escritorio");

  // 2. Cambiar el proyecto en el formulario cambia la vista previa (y volver a elegirlo, también)
  await elegirEnFormulario(1, "Sin proyecto");
  await sleep(300);
  h = await hoja();
  ok((await chip()) === "Formato: Servicios SOTEC" && h.includes("FO-GSST-22") && !(await vista()).logo, "sin proyecto (cliente sin formato propio) vuelve al formato de SOTEC");
  await elegirEnFormulario(1, "PRY-012-25");
  await sleep(300);
  ok((await chip()).startsWith("Formato: Servicios Fortox") && (await vista()).logo, "al elegir de nuevo el proyecto en «Proyecto u obra» vuelve el formato de FORTOX");

  // 3. Guardar: el detalle y el PDF salen en FORTOX y el documento guarda su variante
  await clic(p, "Guardar borrador");
  await p.waitForFunction(() => location.pathname.includes("/app/documentos/ver"));
  await sleep(600);
  const idFortox = new URL(p.url()).searchParams.get("id");
  const guardado = await p.evaluate((k, id) => JSON.parse(localStorage.getItem(k)).documentos.find((d) => d.id === id), CLAVE, idFortox);
  ok(guardado && guardado.variante === "fortox" && /^RT-\d{3}-\d{2}$/.test(guardado.codigo), `el documento guarda la variante «fortox» y sigue la serie RT (${guardado && guardado.codigo})`);
  h = await hoja();
  ok((await vista()).logo && h.includes("Código por confirmar") && (await chip()).startsWith("Formato: Servicios Fortox"), "el detalle muestra el formato de FORTOX y su chip");
  await foto("detalle-fortox-escritorio");
  await p.goto(`${BASE}/imprimir?doc=${idFortox}&volver=/app/documentos`, { waitUntil: "networkidle0" });
  await p.waitForSelector("[data-impresion-lista]", { timeout: 20000 });
  await sleep(300);
  h = await hoja();
  ok((await p.title()).startsWith(`${guardado.codigo} · Reporte técnico`), `el PDF se llama con el consecutivo (${await p.title()})`);
  ok((await vista()).logo && h.includes("FORTOX") && h.includes("Código por confirmar"), "/imprimir sale con el formato de FORTOX");
  await foto("imprimir-fortox");

  // 4. Un proyecto de SOTEC sale como SOTEC
  await p.goto(`${BASE}/app/documentos`, { waitUntil: "networkidle0" });
  await p.evaluate(() => localStorage.removeItem("fd-generador-reporte-u-tec1"));
  await p.goto(`${BASE}/app/nuevo/reporte`, { waitUntil: "networkidle0" });
  await sleep(800);
  await clic(p, "Ladrillera Arcillas del Caribe");
  await clic(p, "PRY-001-26");
  await sleep(300);
  h = await hoja();
  v = await vista();
  ok((await chip()) === "Formato: Servicios SOTEC" && h.includes("FO-GSST-22") && !v.logo && v.fondo === verde, "un proyecto de SOTEC sale con el formato de SOTEC");
  // Cambiar a un proyecto Fortox desde el formulario (cambia el cliente también)
  await elegirEnFormulario(0, "Centro Comercial Mirador");
  await sleep(200);
  await elegirEnFormulario(1, "PRY-012-25");
  await sleep(300);
  ok((await chip()).startsWith("Formato: Servicios Fortox") && (await vista()).logo, "cambiar a un proyecto Servicios Fortox cambia la vista previa");
  await p.evaluate(() => localStorage.removeItem("fd-generador-reporte-u-tec1"));

  // 5. La administración cambia el tipo del proyecto: lo ya guardado no cambia
  await comoUsuario(p, "u-adm");
  await p.goto(`${BASE}/app/proyectos/editar?id=p-12`, { waitUntil: "networkidle0" });
  await sleep(600);
  ok(await p.evaluate(() => document.querySelector('select[aria-label="Tipo de proyecto"]').value === "Servicios Fortox"), "el formulario del proyecto muestra su tipo «Servicios Fortox»");
  await p.select('select[aria-label="Tipo de proyecto"]', "Servicios SOTEC");
  await clic(p, "Guardar proyecto");
  await p.waitForFunction(() => location.pathname.includes("/app/proyectos/ver"));
  await sleep(400);
  await p.goto(`${BASE}/app/documentos/ver?id=${idFortox}`, { waitUntil: "networkidle0" });
  await sleep(500);
  ok((await vista()).logo && (await hoja()).includes("Código por confirmar"), "cambiar el tipo del proyecto no cambia el formato de un reporte ya guardado");
  // Se deja como estaba
  await p.goto(`${BASE}/app/proyectos/editar?id=p-12`, { waitUntil: "networkidle0" });
  await sleep(500);
  await p.select('select[aria-label="Tipo de proyecto"]', "Servicios Fortox");
  await clic(p, "Guardar proyecto");
  await p.waitForFunction(() => location.pathname.includes("/app/proyectos/ver"));

  // 6. Configuración: la lista de tipos se puede ampliar y sale en el formulario del proyecto
  await p.goto(`${BASE}/app/config`, { waitUntil: "networkidle0" });
  await sleep(500);
  await p.type('input[placeholder="Servicios para otra empresa"]', "Servicios Fortox nocturnos");
  await p.select('select[aria-label="Formato del nuevo tipo"]', "fortox");
  await clic(p, "Agregar tipo");
  await sleep(300);
  const tipos = await p.evaluate((k) => JSON.parse(localStorage.getItem(k)).config.tiposProyecto, CLAVE);
  ok(Array.isArray(tipos) && tipos.some((t) => t.nombre === "Servicios Fortox nocturnos" && t.variante === "fortox"), "Configuración agrega un tipo de proyecto con su formato");
  await p.goto(`${BASE}/app/proyectos/editar`, { waitUntil: "networkidle0" });
  await sleep(500);
  ok(await p.evaluate(() => [...document.querySelector('select[aria-label="Tipo de proyecto"]').options].some((o) => o.value === "Servicios Fortox nocturnos")), "el tipo nuevo se puede elegir en el proyecto");

  // 7. Cliente con «Formato por defecto» FORTOX: sin proyecto, el reporte sale en FORTOX
  await p.goto(`${BASE}/app/clientes`, { waitUntil: "networkidle0" });
  await sleep(500);
  await clic(p, "Conjunto Residencial Los Robles");
  await p.select('select[aria-label="Formato por defecto"]', "fortox");
  await clic(p, "Guardar", "form button[type=submit]");
  await sleep(300);
  ok((await p.evaluate((k) => JSON.parse(localStorage.getItem(k)).clientes.find((c) => c.id === "c-conj").variante, CLAVE)) === "fortox", "el cliente guarda su formato por defecto");
  await comoUsuario(p, "u-tec1");
  await p.goto(`${BASE}/app/nuevo/reporte`, { waitUntil: "networkidle0" });
  await sleep(800);
  await clic(p, "Conjunto Residencial Los Robles");
  ok((await chip()).startsWith("Formato: Servicios Fortox") && (await vista()).logo, "al elegir el cliente con formato FORTOX (sin proyecto) sale el formato de FORTOX");
  await clic(p, "Sin proyecto");
  ok((await chip()).startsWith("Formato: Servicios Fortox"), "«Sin proyecto» conserva el formato del cliente");
  // Proyecto antiguo sin tipo: manda el formato del cliente
  await elegirEnFormulario(1, "PRY-004-26");
  await sleep(300);
  ok((await chip()).startsWith("Formato: Servicios Fortox"), "un proyecto antiguo sin tipo usa el formato del cliente");
  await p.evaluate(() => localStorage.removeItem("fd-generador-reporte-u-tec1"));

  // 8. Celular (390): el chip y el encabezado de FORTOX en la pestaña «Formato»
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await p.goto(`${BASE}/app/nuevo/reporte?proyecto=p-12`, { waitUntil: "networkidle0" });
  await sleep(900);
  ok((await chip()).startsWith("Formato: Servicios Fortox"), "con ?proyecto= de un proyecto Fortox, el formato ya es FORTOX (celular)");
  const desborde = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(desborde <= 1, `sin desborde horizontal en 390 px (${desborde})`);
  await foto("generador-fortox-390-asistente");
  await p.evaluate(() => [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Formato")?.click());
  await sleep(400);
  await foto("generador-fortox-390-formato");
  await p.goto(`${BASE}/app/documentos/ver?id=${idFortox}`, { waitUntil: "networkidle0" });
  await sleep(600);
  await foto("detalle-fortox-390");
  await p.evaluate(() => localStorage.removeItem("fd-generador-reporte-u-tec1"));
  await p.close();
}

/**
 * «＋ Agregar otro» en los formularios (mismo almacén que el asistente), letra de 16 px en los
 * campos del celular (iPhone no acerca la pantalla) y nombres de cliente pegados con su NIT.
 * CAPTURAS_LISTAS=/ruta guarda capturas (390 px y escritorio).
 */
async function listas(b, errores) {
  console.log("\n— Listas: «＋ Agregar otro» en los formularios, 16 px en el celular y cliente pegado con su NIT");
  const p = await nuevaPagina(b, errores);
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto(`${BASE}/acceso`, { waitUntil: "networkidle0" });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: "networkidle0" });
  await clic(p, "Administrador");
  await p.waitForFunction(() => location.pathname.startsWith("/app"));
  await sleep(800);
  const estado = () => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), CLAVE);
  const propias = async (clave) => (await estado()).config.opcionesPropias?.[clave] ?? [];
  const ir = async (r, ms = 700) => {
    await p.goto(`${BASE}${r}`, { waitUntil: "networkidle0" });
    await sleep(ms);
  };
  const dir = process.env.CAPTURAS_LISTAS || "";
  if (dir) fs.mkdirSync(dir, { recursive: true });
  const foto = async (pg, n) => dir && (await pg.screenshot({ path: path.join(dir, `${n}.png`), fullPage: false }));
  const OTRO = "__agregar_otro__";
  const opcionesDe = (sel) => p.evaluate((s) => [...document.querySelector(s).options].map((o) => o.value), sel);
  const valorDe = (sel) => p.evaluate((s) => document.querySelector(s)?.value ?? null, sel);
  /** Elige «＋ Agregar otro…» en el select, escribe y confirma con Enter. */
  async function agregarOtro(sel, texto) {
    await p.select(sel, OTRO);
    await sleep(200);
    if (texto) await p.keyboard.type(texto);
    await p.keyboard.press("Enter");
    await sleep(350);
  }
  const borrarBorradores = () => p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("fd-generador-")).forEach((k) => localStorage.removeItem(k)));

  // 1. Tipo de gasto nuevo en una fila de la legalización
  await borrarBorradores();
  await ir("/app/nuevo/gasto", 900);
  await clic(p, "Agregar fila");
  const tipo1 = 'select[aria-label="Tipo gasto 1"]';
  ok((await opcionesDe(tipo1)).includes(OTRO), "la fila del gasto ofrece «＋ Agregar otro…» en el tipo");
  await p.select(tipo1, OTRO);
  await sleep(200);
  await p.keyboard.press("Enter");
  await sleep(250);
  ok((await p.evaluate(() => document.body.innerText.includes("Escribe la nueva opción"))) && (await propias("gasto.items")).length === 0, "una opción vacía no se agrega (avisa)");
  await p.keyboard.press("Escape");
  await sleep(250);
  ok((await valorDe(tipo1)) === "Otros", "Esc cancela y vuelve a la lista con el tipo anterior");
  await agregarOtro(tipo1, "  Peajes  ");
  ok((await valorDe(tipo1)) === "Peajes" && JSON.stringify(await propias("gasto.items")) === '["Peajes"]', "el tipo nuevo (recortado) queda elegido y guardado para la empresa");
  await clic(p, "Agregar fila");
  await agregarOtro('select[aria-label="Tipo gasto 2"]', "PEAJES");
  ok((await valorDe('select[aria-label="Tipo gasto 2"]')) === "Peajes" && (await propias("gasto.items")).length === 1, "escrito con otras mayúsculas usa el existente (no se repite)");
  await agregarOtro('select[aria-label="Tipo gasto 2"]', "alimentacion");
  ok((await valorDe('select[aria-label="Tipo gasto 2"]')) === "Alimentación" && (await propias("gasto.items")).length === 1, "sin tilde usa el del catálogo («Alimentación») y no se guarda");
  await foto(p, "gasto-escritorio");
  // La próxima vez: en el formulario y en el asistente
  await borrarBorradores();
  await ir("/app/nuevo/gasto", 900);
  await clic(p, "Agregar fila");
  ok((await opcionesDe(tipo1)).includes("Peajes"), "la próxima legalización ofrece «Peajes» en el formulario");
  await borrarBorradores();
  await ir("/app/nuevo/gasto", 900);
  await responder(p, "Ladrillera Arcillas del Caribe");
  if (await p.evaluate(() => [...document.querySelectorAll("main button")].some((x) => x.textContent.trim() === "Sin proyecto"))) await clic(p, "Sin proyecto");
  await responder(p, "Administración");
  await clic(p, String(new Date().getFullYear()));
  await responder(p, "3001234567");
  const chips = () => p.evaluate(() => [...document.querySelectorAll("main button[aria-pressed]")].map((x) => x.textContent.trim()));
  ok((await chips()).includes("Peajes"), "el asistente también ofrece «Peajes» al registrar un gasto");
  await clic(p, "Otro tipo");
  await p.type('main input[aria-label="Nueva opción"]', "Lavado de vehículo");
  await p.keyboard.press("Enter");
  await sleep(350);
  ok((await p.evaluate(() => [...document.querySelectorAll("main button[aria-pressed=true]")].map((x) => x.textContent.trim()))).includes("Lavado de vehículo") && (await propias("gasto.items")).includes("Lavado de vehículo"), "«Otro tipo» en el asistente lo marca y lo guarda en la misma lista");
  await clic(p, "Agregar fila");
  ok((await opcionesDe(tipo1)).includes("Lavado de vehículo"), "lo agregado en el asistente aparece en el formulario");

  // 2. Cotización: unidad nueva y servicio nuevo desde el formato
  await borrarBorradores();
  await ir("/app/nuevo/cotizacion", 900);
  await clic(p, "Agregar ítem");
  await agregarOtro('select[aria-label="Unidad ítem 1"]', "Rollos");
  ok((await valorDe('select[aria-label="Unidad ítem 1"]')) === "Rollos" && (await propias("cotizacion.unidad")).includes("Rollos"), "cotización: la unidad nueva («Rollos») queda en el ítem y en la lista de la empresa");
  await p.select('select[aria-label="Agregar del catálogo"]', "__nuevo__");
  await sleep(250);
  await p.type('input[aria-label="Descripción del servicio o producto"]', "Cámara domo 4 MP de prueba");
  await p.type('input[aria-label="Precio de referencia sin IVA"]', "350000");
  await p.keyboard.press("Enter");
  await sleep(400);
  const s2 = await estado();
  ok((s2.config.serviciosPropios ?? []).some((x) => x.descripcion === "Cámara domo 4 MP de prueba") && (await p.evaluate(() => document.querySelector(".doc-print").innerText.includes("Cámara domo 4 MP de prueba"))), "cotización: «＋ Nuevo servicio o producto…» lo agrega al catálogo de la empresa y como ítem");
  await clic(p, "Agregar ítem");
  ok((await opcionesDe('select[aria-label="Unidad ítem 3"]')).includes("Rollos"), "la unidad nueva se ofrece en los demás ítems");
  await foto(p, "cotizacion-escritorio");

  // 3. Equipos: sistema y tipo nuevos en la ficha; luego en el selector del reporte
  await ir("/app/equipos/ver?nuevo=1&cliente=c-conj", 700);
  await agregarOtro('select[aria-label="Sistema"]', "Sonido ambiental");
  ok((await valorDe('select[aria-label="Sistema"]')) === "Sonido ambiental", "ficha del equipo: sistema nuevo elegido");
  await agregarOtro('select[aria-label="Tipo de equipo"]', "Parlante de techo");
  await p.type('input[placeholder="Ej: Cámara 7 – Portería"]', "Parlante lobby");
  await foto(p, "equipo-escritorio");
  await clic(p, "Registrar equipo", "button[type=submit]");
  await p.waitForFunction(() => location.search.includes("ok=creado"), { timeout: 10000 }).catch(() => {});
  await sleep(400);
  const s3 = await estado();
  ok(s3.equipos.some((e) => e.nombre === "Parlante lobby" && e.sistema === "Sonido ambiental" && e.tipo === "Parlante de techo"), "se registra el equipo con el sistema y el tipo nuevos");
  ok((await propias("equipos.sistema")).includes("Sonido ambiental") && (await propias("equipos.tipo.Sonido ambiental")).includes("Parlante de techo"), "sistema y tipo quedan en las listas de la empresa");
  await borrarBorradores();
  await ir("/app/nuevo/reporte", 900);
  await p.select('section[aria-label="Cliente y proyecto"] select', "c-conj");
  await sleep(400);
  await p.evaluate(() => [...document.querySelectorAll('section[aria-labelledby="titulo-equipos"] button')].find((x) => x.textContent.includes("Nuevo equipo"))?.click());
  await sleep(300);
  const radios = await p.evaluate(() => [...document.querySelectorAll('section[aria-labelledby="titulo-equipos"] [role=radio]')].map((x) => x.textContent.trim()));
  ok(radios.includes("Sonido ambiental"), "el selector de equipos del reporte ofrece el sistema nuevo");
  ok(await p.evaluate(() => [...document.querySelectorAll('section[aria-labelledby="titulo-equipos"] button')].some((x) => x.textContent.includes("Otro sistema"))), "el selector del reporte también tiene «＋ Otro sistema»");

  // 4. Configuración: la administración ve lo agregado (para revisar o quitar)
  await ir("/app/config", 700);
  const cfg = await p.evaluate(() => document.querySelector("main").textContent);
  ok(cfg.includes("Tipo de gasto") && cfg.includes("Peajes") && cfg.includes("Equipos · Sistemas") && cfg.includes("Rollos") && cfg.includes("Sonido ambiental"), "Configuración lista lo agregado (tipo de gasto, unidad, sistema)");

  // 5. Nombre de cliente pegado con su NIT (caso típico): asistente, formato y Clientes
  const PEGADO = "* Razón social: FARO ANDINO S.A.S. * NIT: 900123456";
  await borrarBorradores();
  await ir("/app/nuevo/cotizacion", 900);
  await responder(p, PEGADO);
  const docCot = await p.evaluate(() => document.querySelector(".doc-print").innerText);
  const chat = await p.evaluate(() => document.querySelector("main").innerText);
  ok(docCot.includes("FARO ANDINO S.A.S.") && !docCot.includes("Razón social") && docCot.includes("900.123.456"), "asistente: el nombre queda «FARO ANDINO S.A.S.» y el NIT pasa a su campo");
  ok(chat.includes("Separé el NIT 900.123.456"), "asistente: avisa «Separé el NIT…»");
  await editarCampo(p, "cliente", "Razón social: Inversiones Prueba S.A.S. NIT: 900.123.456-1");
  const docCot2 = await p.evaluate(() => document.querySelector(".doc-print").innerText);
  ok(docCot2.includes("Inversiones Prueba S.A.S.") && !docCot2.includes("Razón social"), "formato: el nombre escrito con su NIT también se separa");
  await ir("/app/clientes", 600);
  await clic(p, "Nuevo cliente");
  await p.evaluate((t) => {
    const i = document.querySelector("main form input");
    const dt = new DataTransfer();
    dt.setData("text/plain", t);
    i.focus();
    i.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  }, "Razón social: FARO ANDINO S.A.S.\nNIT: 900123456");
  await sleep(300);
  const campos = await p.evaluate(() => [...document.querySelectorAll("main form input")].slice(0, 2).map((x) => x.value));
  ok(campos[0] === "FARO ANDINO S.A.S." && campos[1] === "900.123.456" && (await p.evaluate(() => document.querySelector("main").innerText.includes("Separé el NIT"))), "Clientes: al pegar se separan nombre y NIT con el aviso");
  await clic(p, "Guardar", "button[type=submit]");
  ok((await estado()).clientes.some((c) => c.nombre === "FARO ANDINO S.A.S." && c.nit === "900.123.456"), "Clientes: se guarda «FARO ANDINO S.A.S.» con su NIT");
  // Un nombre que ya quedó mal guardado: «Nombres por revisar» → Corregir → Guardar
  await p.evaluate((k) => {
    const st = JSON.parse(localStorage.getItem(k));
    st.clientes.push({ id: "c-mal", nombre: "* Razón social: Ferretería Prueba S.A.S. * NIT: 800123456", nit: "", direccion: "", contacto: "", cargo: "", correo: "", telefono: "", sitio: "" });
    localStorage.setItem(k, JSON.stringify(st));
  }, CLAVE);
  await ir("/app/clientes", 600);
  ok(await p.evaluate(() => document.querySelector("main").innerText.includes("Nombres por revisar")), "Clientes: muestra «Nombres por revisar»");
  await foto(p, "clientes-por-revisar-escritorio");
  await clic(p, "Corregir");
  await clic(p, "Guardar", "button[type=submit]");
  const mal = (await estado()).clientes.find((c) => c.id === "c-mal");
  ok(mal.nombre === "Ferretería Prueba S.A.S." && mal.nit === "800.123.456", "Clientes: «Corregir» deja el nombre limpio y el NIT en su campo");

  // 6. Celular (390 px): campos de 16 px (iPhone no acerca), la plantilla conserva su letra, sin desbordes a 320 px
  const m = await nuevaPagina(b, errores);
  await m.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1");
  await m.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  const pequeños = [];
  for (const r of ["/app/nuevo/gasto", "/app/nuevo/cotizacion", "/app/clientes", "/app/equipos/ver?nuevo=1&cliente=c-conj", "/app/config", "/app/nuevo/reporte"]) {
    await m.goto(BASE + r, { waitUntil: "networkidle0" });
    await sleep(500);
    if (r === "/app/clientes") await m.evaluate(() => [...document.querySelectorAll("button")].find((x) => x.textContent.includes("Nuevo cliente"))?.click());
    await sleep(200);
    const malos = await m.evaluate(() =>
      [...document.querySelectorAll("input, select, textarea")]
        .filter((e) => !["checkbox", "radio", "file", "hidden", "range", "color"].includes(e.type) && !e.closest(".doc-print") && e.getClientRects().length)
        .map((e) => [e.getAttribute("aria-label") || e.name || e.placeholder || e.tagName, parseFloat(getComputedStyle(e).fontSize)])
        .filter(([, f]) => f < 16),
    );
    malos.forEach(([n, f]) => pequeños.push(`${r} ${n} ${f}px`));
  }
  ok(pequeños.length === 0, pequeños.length ? `campos con letra < 16 px: ${pequeños.slice(0, 5).join(", ")}` : "a 390 px todos los campos del aplicativo tienen 16 px o más");
  await m.goto(`${BASE}/app/nuevo/gasto`, { waitUntil: "networkidle0" });
  await sleep(500);
  await m.evaluate(() => [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Formato" || x.textContent.includes("Vista"))?.click());
  await sleep(300);
  const letraDoc = await m.evaluate(() => parseFloat(getComputedStyle(document.querySelector(".doc-print")).fontSize));
  ok(letraDoc < 14, `la plantilla conserva la letra del formato en el celular (${letraDoc}px)`);
  ok(await m.evaluate(() => document.querySelector('meta[name="viewport"]').content.includes("maximum-scale=1")), "en iPhone el viewport evita el acercamiento al editar dentro de la plantilla");
  await foto(m, "gasto-390");
  await m.evaluate(() => [...document.querySelectorAll("button")].find((x) => x.textContent.includes("Agregar fila"))?.click());
  await sleep(300);
  await m.select('select[aria-label="Tipo gasto 1"]', OTRO);
  await sleep(300);
  await foto(m, "gasto-otro-390");
  await m.goto(`${BASE}/app/equipos/ver?nuevo=1&cliente=c-conj`, { waitUntil: "networkidle0" });
  await sleep(400);
  await m.select('select[aria-label="Sistema"]', OTRO);
  await sleep(300);
  await foto(m, "equipo-otro-390");
  await m.goto(`${BASE}/app/clientes`, { waitUntil: "networkidle0" });
  await sleep(400);
  await foto(m, "clientes-390");
  const android = await nuevaPagina(b, errores);
  await android.setViewport({ width: 390, height: 844, isMobile: true });
  await android.goto(`${BASE}/app`, { waitUntil: "networkidle0" });
  ok(!(await android.evaluate(() => document.querySelector('meta[name="viewport"]').content.includes("maximum-scale"))), "fuera de iOS el viewport no limita el zoom");
  await android.close();
  await m.setViewport({ width: 320, height: 700, isMobile: true, hasTouch: true });
  const desbordes = [];
  for (const r of ["/app/nuevo/gasto", "/app/equipos/ver?nuevo=1&cliente=c-conj", "/app/clientes", "/app/nuevo/cotizacion"]) {
    await m.goto(BASE + r, { waitUntil: "networkidle0" });
    await sleep(400);
    const sw = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (sw > 0) desbordes.push(`${r} (+${sw}px)`);
  }
  ok(desbordes.length === 0, desbordes.length ? `desbordes a 320 px: ${desbordes.join(", ")}` : "sin desbordes a 320 px");
  await m.close();
  await p.close();
}

(async () => {
  const b = await puppeteer.launch({ executablePath: chrome(), headless: true, args: ["--no-sandbox"] });
  const errores = [];
  try {
    if (!SOLO || SOLO === "flujo") await flujo(b, errores);
    if (!SOLO || SOLO === "responsive") await responsive(b, errores);
    if (!SOLO || SOLO === "controles") await controles(b, errores);
    if (!SOLO || SOLO === "magno") await magno(b, errores);
    if (!SOLO || SOLO === "proyectos") await proyectos(b, errores);
    if (!SOLO || SOLO === "crud") await crud(b, errores);
    if (!SOLO || SOLO === "equipos") await equipos(b, errores);
    if (!SOLO || SOLO === "navegacion") await navegacion(b, errores);
    if (!SOLO || SOLO === "comercial") await comercial(b, errores);
    if (!SOLO || SOLO === "impresion") await impresion(b, errores);
    if (!SOLO || SOLO === "campo") await campo(b, errores);
    if (!SOLO || SOLO === "variantes") await variantes(b, errores);
    if (!SOLO || SOLO === "listas") await listas(b, errores);
  } catch (e) {
    ok(false, `error: ${e.message}`);
  } finally {
    await b.close();
  }
  ok(errores.length === 0, errores.length ? `errores en consola: ${errores.slice(0, 3).join(" | ")}` : "sin errores en consola");
  console.log(fallos ? `\n${fallos} comprobación(es) fallaron` : "\nTodo en verde");
  process.exit(fallos ? 1 : 0);
})();
