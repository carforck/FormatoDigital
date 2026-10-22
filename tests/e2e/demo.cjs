/**
 * Prueba de punta a punta de la demo en un navegador real.
 *
 *   node tests/e2e/demo.cjs                       # contra http://localhost:3100
 *   BASE=https://formato-digital-nine.vercel.app node tests/e2e/demo.cjs
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
const SOLO = process.env.SOLO; // "flujo" | "responsive" | "controles" | "magno" | "proyectos" | "crud"
const CLAVE = "sotec-demo-v7";
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

  // 5. Cotización en un proyecto: la crea SST, la aprueba la gerencia y el cliente la acepta firmando
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
  await clic(p, "Enviar a revisión");
  await p.waitForFunction(() => location.pathname.includes("/app/documentos/ver"), { timeout: 15000 });
  await sleep(600);
  const urlCot = p.url();
  ok((await p.evaluate(() => document.querySelector("h1").innerText)).includes("COT-004-26") && (await texto()).includes("Proyecto PRY-001-26"), "la cotización COT-004-26 queda en el proyecto");
  // Rechazo con motivo → el autor la corrige y la reenvía
  await comoUsuario(p, "u-adm");
  await p.goto(urlCot, { waitUntil: "networkidle0" });
  await sleep(600);
  await clic(p, "Rechazar");
  await clic(p, "Falta detallar las recomendaciones", "[role=dialog] button");
  await clic(p, "Rechazar", "[role=dialog] .justify-end button:last-child");
  ok((await p.evaluate(() => document.querySelector("h1").innerText)).includes("Rechazado"), "la gerencia rechaza la cotización con motivo");
  await comoUsuario(p, "u-sup");
  await p.goto(urlCot, { waitUntil: "networkidle0" });
  await sleep(600);
  await clic(p, "Editar");
  await p.waitForFunction(() => location.pathname.includes("/app/nuevo/cotizacion"), { timeout: 15000 });
  await sleep(800);
  await clic(p, "Enviar a revisión");
  await p.waitForFunction(() => location.pathname.includes("/app/documentos/ver"), { timeout: 15000 });
  await sleep(600);
  ok((await p.evaluate(() => document.querySelector("h1").innerText)).includes("En revisión"), "el autor edita la cotización rechazada y la reenvía");
  await comoUsuario(p, "u-adm");
  await p.goto(urlCot, { waitUntil: "networkidle0" });
  await sleep(600);
  await clic(p, "Aprobar y enviar al cliente");
  ok((await p.evaluate(() => document.querySelector("h1").innerText)).includes("Aprobada"), "la gerencia aprueba la cotización (queda enviada al cliente)");

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

  // Cotización: duplicar y eliminar el borrador del autor
  await comoUsuario(p, "u-sup");
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
  await p.type('input[list="tipos-equipo"]', "Teclado");
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
  await p.type('input[list="tipos-equipo"]', "Teclado");
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
  } catch (e) {
    ok(false, `error: ${e.message}`);
  } finally {
    await b.close();
  }
  ok(errores.length === 0, errores.length ? `errores en consola: ${errores.slice(0, 3).join(" | ")}` : "sin errores en consola");
  console.log(fallos ? `\n${fallos} comprobación(es) fallaron` : "\nTodo en verde");
  process.exit(fallos ? 1 : 0);
})();
