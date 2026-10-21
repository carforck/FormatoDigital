/**
 * Prueba de punta a punta de la demo en un navegador real.
 *
 *   node tests/e2e/demo.cjs                       # contra http://localhost:3100
 *   BASE=https://carforck.github.io/FormatoDigital node tests/e2e/demo.cjs
 *
 * Necesita Chrome/Chromium: CHROME=/ruta/al/chrome (por defecto busca el de Playwright).
 * Recorre: técnico crea y envía un reporte, validación del permiso, acceso
 * restringido, coordinador aprueba, cliente firma; pedidos de Magno (fotos,
 * firma por enlace, envío, cuenta de cobro); que ninguna pantalla se desborde
 * en 8 anchos y los controles del shell.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const puppeteer = require("puppeteer-core");

const BASE = (process.env.BASE || "http://localhost:3100").replace(/\/$/, "");
const SOLO = process.env.SOLO; // "flujo" | "responsive" | "controles" | "magno"
const CLAVE = "sotec-demo-v2";
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
  await clic(p, "Correctivo");
  await clic(p, String(new Date().getFullYear()));
  await clic(p, "Ing. Daniel Ortega");
  await clic(p, "Reparación fibra óptica");
  await clic(p, "Redactar borrador");
  await clic(p, "Enviar", "form button");
  await clic(p, "Programar mantenimiento");
  await clic(p, "Continuar sin fotos");
  await clic(p, "Andrés Camacho Ruiz");
  await clic(p, "Firmar ahora");
  await firmar(p);
  await clic(p, "Continuar");
  await clic(p, "Enviar a revisión");
  await p.waitForFunction(() => location.pathname.includes("/app/documentos/ver"));
  await sleep(500);
  const urlReporte = p.url();
  ok((await p.evaluate(() => document.body.innerText)).includes("En revisión"), "el técnico envía el reporte a revisión");

  await p.goto(`${BASE}/app/nuevo/permiso`, { waitUntil: "networkidle0" });
  await sleep(600);
  await clic(p, "Constructora Horizonte Azul");
  await clic(p, "Torre Norte");
  await clic(p, "07:30");
  await clic(p, "Trabajo en alturas");
  await clic(p, "Trabajo en alturas en");
  for (let i = 0; i < 4; i++) await clic(p, "Continuar con");
  await clic(p, "Todas en SÍ");
  await clic(p, "Confirmar verificación");
  await p.type('input[placeholder="Nombre completo"]', "Kevin Mendoza Ortiz");
  await p.type('input[placeholder="Cédula"]', "1000000004");
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
    "/app/documentos/ver?id=d-rt-clay", "/app/revision", "/app/clientes", "/app/usuarios", "/app/config", "/app/auditoria"];
  const ANCHOS = [320, 375, 414, 768, 1024, 1280, 1440, 1920];
  const p = await nuevaPagina(b, errores);
  await p.goto(`${BASE}/acceso`, { waitUntil: "networkidle0" });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: "networkidle0" });
  await clic(p, "Administrador");
  await sleep(1200);
  const problemas = [];
  for (const w of ANCHOS) {
    await p.setViewport({ width: w, height: 900, isMobile: w < 768 });
    for (const r of RUTAS) {
      await p.goto(BASE + r, { waitUntil: "networkidle0" });
      await sleep(300);
      const sw = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (sw > 0) problemas.push(`${w}px ${r} (+${sw}px)`);
    }
  }
  ok(problemas.length === 0, problemas.length ? `desbordes: ${problemas.join(", ")}` : `sin desbordes en ${RUTAS.length} pantallas × 8 anchos`);
  await p.close();
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
  await p.type("header input", "fibra");
  await p.keyboard.press("Enter");
  await sleep(1200);
  ok((await p.evaluate(() => location.search === "?q=fibra" && document.querySelectorAll("tbody tr").length === 1)), "el buscador superior filtra documentos");
  await p.goto(`${BASE}/app/config`, { waitUntil: "networkidle0" });
  await sleep(500);
  ok((await p.evaluate(() => document.body.innerText)).includes("Acceso restringido"), "el coordinador SST no entra a Configuración");
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
  await clic(p, "Preventivo");
  await clic(p, String(new Date().getFullYear()));
  await clic(p, "Ing. Daniel Ortega");
  await clic(p, "Mantenimiento preventivo CCTV");
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
  await p.type('input[placeholder="Nombre de quien firma"]', "Arq. Laura Gómez");
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
  await clic(p, "Ladrillera Arcillas del Caribe · Hornilla");
  await clic(p, String(new Date().getFullYear()));
  await clic(p, "Omitir");
  await clic(p, "Transporte");
  await p.type('input[placeholder="Descripción o motivo"]', "Taxi a la obra");
  await p.type('input[aria-label="Valor del gasto"]', "45000");
  await clic(p, "Agregar gasto"); // sin recibo ni foto: se acepta en el asistente, la validación lo frena al enviar
  await p.type('input[placeholder="Descripción o motivo"]', "Almuerzo de la comisión");
  await p.type('input[placeholder="N° recibo / factura"]', "FE-123");
  await p.type('input[aria-label="Valor del gasto"]', "28000");
  const foto = await p.$('input[aria-label="Foto de la factura"]');
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
  const fotoFila = await p.$('input[aria-label="Foto factura gasto 1"]');
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

(async () => {
  const b = await puppeteer.launch({ executablePath: chrome(), headless: true, args: ["--no-sandbox"] });
  const errores = [];
  try {
    if (!SOLO || SOLO === "flujo") await flujo(b, errores);
    if (!SOLO || SOLO === "responsive") await responsive(b, errores);
    if (!SOLO || SOLO === "controles") await controles(b, errores);
    if (!SOLO || SOLO === "magno") await magno(b, errores);
  } catch (e) {
    ok(false, `error: ${e.message}`);
  } finally {
    await b.close();
  }
  ok(errores.length === 0, errores.length ? `errores en consola: ${errores.slice(0, 3).join(" | ")}` : "sin errores en consola");
  console.log(fallos ? `\n${fallos} comprobación(es) fallaron` : "\nTodo en verde");
  process.exit(fallos ? 1 : 0);
})();
