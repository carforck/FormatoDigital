/* eslint-disable */
/**
 * Service worker de ControlOne (escrito a mano, sin librerías).
 *
 * Lo registra `src/components/pwa/RegistroPWA.tsx` SOLO en producción, como
 * `/sw.js?v=<versión del despliegue>`: cada despliegue cambia la URL, el navegador
 * instala este archivo de nuevo en segundo plano y así el caché siempre corresponde
 * a la última versión publicada.
 *
 * Estrategias (ver «App instalable y sin conexión» en README.md):
 *   - Precaché al instalar: las páginas clave (landing, /acceso, /offline y las de /app),
 *     los JS/CSS que esas páginas cargan, el manifiesto, los íconos y las animaciones Lottie.
 *   - /_next/static/*  → primero el caché (archivos inmutables: su nombre lleva un hash).
 *   - Páginas (navegación) → primero la red (con espera máxima si ya hay copia); si falla,
 *     la copia guardada de esa ruta y, si no hay, la página /offline.
 *   - Otros archivos de public/ → la copia guardada y se renueva en segundo plano.
 *   - NUNCA pasan por el caché: /api/*, Supabase (*.supabase.co) y cualquier otro dominio,
 *     peticiones que no son GET, la autenticación ni las peticiones RSC de Next.
 *
 * Actualizaciones silenciosas: la versión nueva se instala en segundo plano, se activa
 * sola (skipWaiting + clients.claim) y NO recarga la página: lo que el usuario está
 * diligenciando sigue intacto. Como las páginas van primero a la red, la próxima vez que
 * se abra la app o se navegue con conexión ya se ve la versión nueva.
 *
 * Para vaciar todos los cachés o cambiar la estrategia, sube VERSION_CACHE.
 */

/** Súbela (v2, v3…) si cambias la forma de guardar en caché: borra todo lo anterior al activarse. */
const VERSION_CACHE = "v1";
/** Versión del despliegue (la pone RegistroPWA en ?v=); separa el caché de páginas de cada despliegue. */
const DESPLIEGUE = new URL(self.location.href).searchParams.get("v") || "local";

/** Páginas y archivos de public/ de este despliegue. */
const CACHE_APP = `co-app-${VERSION_CACHE}-${DESPLIEGUE}`;
/** JS, CSS y fuentes de /_next/static: se conservan entre despliegues (una pestaña vieja aún puede pedirlos). */
const CACHE_ESTATICOS = `co-static-${VERSION_CACHE}`;
/** Tope de archivos estáticos guardados; al pasarlo se borran los más antiguos. */
const MAX_ESTATICOS = 400;
/** Espera máxima de la red para una página que ya tiene copia (señal débil en campo). */
const ESPERA_RED_MS = 5000;

/** Rutas que se guardan al instalar para que la app abra sin conexión. */
const PAGINAS = [
  "/",
  "/acceso",
  "/offline",
  "/app",
  "/app/nuevo/reporte",
  "/app/nuevo/permiso",
  "/app/nuevo/gasto",
  "/app/nuevo/cotizacion",
  "/app/documentos",
  "/app/documentos/ver",
  "/app/revision",
  "/app/proyectos",
  "/app/proyectos/ver",
  "/app/proyectos/editar",
  "/app/equipos",
  "/app/equipos/ver",
  "/app/cobros",
  "/app/cobros/nueva",
  "/app/cobros/ver",
  "/app/clientes",
  "/app/usuarios",
  "/app/config",
  "/app/auditoria",
  "/app/mapa",
  "/imprimir",
];

/** Archivos de public/ que se guardan al instalar. */
const ARCHIVOS = [
  "/manifest.webmanifest",
  "/icon.svg",
  "/iconos/icon-192.png",
  "/iconos/icon-512.png",
  "/iconos/icon-maskable-512.png",
  "/iconos/apple-touch-icon.png",
  "/lottie/control.json",
  "/lottie/digitaliza.json",
  "/sotec-logo-v3.png",
  "/sotec-logo-v3-oscuro.png",
];

/** Ruta sin la barra final (las copias de las páginas se guardan por ruta, sin la query). */
const clave = (pathname) => (pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname);

/** Los JS, CSS y fuentes de /_next/static que menciona una página (etiquetas y carga de React). */
function estaticosDe(html) {
  const urls = new Set();
  for (const m of html.matchAll(/(?:\/_next\/)?static\/(?:chunks|css|media)\/[^"'\s\\)<>]+/g)) {
    urls.add(m[0].startsWith("/_next/") ? m[0] : `/_next/${m[0]}`);
  }
  return urls;
}

/** Borra los estáticos más antiguos si el caché pasó el tope. */
async function recortar(cache) {
  const claves = await cache.keys();
  const sobran = claves.length - MAX_ESTATICOS;
  for (let i = 0; i < sobran; i++) await cache.delete(claves[i]);
}

// Instalación: precaché de páginas, sus estáticos y los archivos clave. Una ruta que falle
// no impide instalar; /offline sí es obligatoria (es el último recurso sin conexión).
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const app = await caches.open(CACHE_APP);
      const estaticos = await caches.open(CACHE_ESTATICOS);
      const pendientes = new Set();
      await Promise.all(
        PAGINAS.map(async (ruta) => {
          try {
            const r = await fetch(ruta, { cache: "no-cache", credentials: "same-origin" });
            if (!r.ok || r.redirected) return;
            const html = await r.clone().text();
            await app.put(ruta, r);
            for (const u of estaticosDe(html)) pendientes.add(u);
          } catch {
            /* sin red o ruta caída: se guardará la próxima vez que se visite */
          }
        }),
      );
      await Promise.all(
        [...pendientes].map(async (u) => {
          if (await estaticos.match(u)) return;
          try {
            const r = await fetch(u);
            if (r.ok) await estaticos.put(u, r);
          } catch {
            /* se guardará al usarse */
          }
        }),
      );
      await Promise.all(
        ARCHIVOS.map(async (u) => {
          try {
            const r = await fetch(u, { cache: "no-cache" });
            if (r.ok) await app.put(u, r);
          } catch {
            /* opcional */
          }
        }),
      );
      if (!(await app.match("/offline"))) throw new Error("No se pudo guardar /offline");
      // Actualización silenciosa: no espera a que se cierren las pestañas (no se recarga nada)
      await self.skipWaiting();
    })(),
  );
});

// Activación: borra los cachés de versiones anteriores y toma el control de las pestañas abiertas
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const nombres = await caches.keys();
      await Promise.all(nombres.filter((n) => n.startsWith("co-") && n !== CACHE_APP && n !== CACHE_ESTATICOS).map((n) => caches.delete(n)));
      // La red arranca mientras el service worker despierta (navegaciones más rápidas)
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Solo GET: guardar, iniciar sesión y la API nunca pasan por aquí
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Otros dominios (Supabase: datos y autenticación) van siempre directo a la red
  if (url.origin !== self.location.origin || url.hostname.endsWith(".supabase.co")) return;
  // API del servidor, autenticación y el propio service worker: nunca en caché
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth") || url.pathname === "/sw.js") return;
  if (url.pathname.startsWith("/_next/webpack-hmr") || req.headers.has("range")) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(primeroCache(req));
    return;
  }
  // Navegación del lado del cliente de Next (RSC): solo red. Si falla sin conexión, Next hace
  // una navegación completa, que sí atiende el caché de páginas de abajo.
  if (req.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) return;

  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(paginaRedPrimero(event, url));
    return;
  }
  event.respondWith(copiaYRenovar(event));
});

/** /_next/static: inmutable, así que si está guardado se usa sin preguntar a la red. */
async function primeroCache(req) {
  const cache = await caches.open(CACHE_ESTATICOS);
  const guardado = await cache.match(req.url);
  if (guardado) return guardado;
  const r = await fetch(req);
  if (r.ok && r.type === "basic") cache.put(req.url, r.clone()).then(() => recortar(cache));
  return r;
}

/**
 * Páginas: primero la red (y se actualiza la copia). Si no hay red, la copia de esa ruta
 * (las páginas son estáticas y leen ?id= en el navegador, por eso se guardan sin la query)
 * y si no, /offline. Con copia guardada, la red tiene ESPERA_RED_MS para responder.
 */
async function paginaRedPrimero(event, url) {
  const cache = await caches.open(CACHE_APP);
  const ruta = clave(url.pathname);
  const copia = await cache.match(ruta);
  const red = (async () => {
    const r = (await event.preloadResponse) || (await fetch(event.request));
    if (r.ok && r.type === "basic" && !r.redirected) await cache.put(ruta, r.clone());
    return r;
  })();
  try {
    if (!copia) return await red;
    let espera;
    const tiempo = new Promise((ok) => (espera = setTimeout(() => ok(null), ESPERA_RED_MS)));
    // Si la red tarda, se sirve la copia y la red termina de actualizarla en segundo plano
    event.waitUntil(red.catch(() => null));
    const r = await Promise.race([red, tiempo]);
    clearTimeout(espera);
    // Un error del servidor (5xx) con copia guardada: mejor la copia
    return r && r.status < 500 ? r : copia;
  } catch {
    return copia || (await cache.match("/offline")) || new Response("Sin conexión", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

/** Archivos de public/ (íconos, Lottie, imágenes, manifiesto): la copia al instante y se renueva. */
async function copiaYRenovar(event) {
  const cache = await caches.open(CACHE_APP);
  const copia = await cache.match(event.request, { ignoreSearch: true });
  const red = fetch(event.request)
    .then((r) => {
      if (r.ok && r.type === "basic") cache.put(event.request, r.clone());
      return r;
    })
    .catch(() => null);
  if (copia) {
    event.waitUntil(red);
    return copia;
  }
  return (await red) || Response.error();
}
