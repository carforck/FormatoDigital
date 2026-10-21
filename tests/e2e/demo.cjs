/**
 * Prueba de punta a punta de la demo en un navegador real.
 *
 *   node tests/e2e/demo.cjs                       # contra http://localhost:3100
 *   BASE=https://carforck.github.io/FormatoDigital node tests/e2e/demo.cjs
 *
 * Necesita Chrome/Chromium: CHROME=/ruta/al/chrome (por defecto busca el de Playwright).
 * Recorre: técnico crea y envía un reporte, validación del permiso, acceso
 * restringido, coordinador aprueba, cliente firma; además revisa que ninguna
 * pantalla se desborde en 8 anchos y los controles del shell.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const puppeteer = require("puppeteer-core");

const BASE = (process.env.BASE || "http://localhost:3100").replace(/\/$/, "");
const SOLO = process.env.SOLO; // "flujo" | "responsive" | "controles"
const CLAVE = "sotec-demo-v1";
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
  const RUTAS = ["/", "/acceso", "/app", "/app/nuevo/reporte", "/app/nuevo/permiso", "/app/documentos", "/app/documentos/ver?id=d-pt-clay",
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
  ok(problemas.length === 0, problemas.length ? `desbordes: ${problemas.join(", ")}` : "sin desbordes en 13 pantallas × 8 anchos");
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

(async () => {
  const b = await puppeteer.launch({ executablePath: chrome(), headless: true, args: ["--no-sandbox"] });
  const errores = [];
  try {
    if (!SOLO || SOLO === "flujo") await flujo(b, errores);
    if (!SOLO || SOLO === "responsive") await responsive(b, errores);
    if (!SOLO || SOLO === "controles") await controles(b, errores);
  } catch (e) {
    ok(false, `error: ${e.message}`);
  } finally {
    await b.close();
  }
  ok(errores.length === 0, errores.length ? `errores en consola: ${errores.slice(0, 3).join(" | ")}` : "sin errores en consola");
  console.log(fallos ? `\n${fallos} comprobación(es) fallaron` : "\nTodo en verde");
  process.exit(fallos ? 1 : 0);
})();
