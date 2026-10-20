/**
 * En GitHub Pages (GITHUB_PAGES=true) se exporta como sitio estático bajo /FormatoDigital.
 * En local (`npm run dev`) se sirve normal en la raíz.
 */
const pages = process.env.GITHUB_PAGES === "true";
const basePath = pages ? "/FormatoDigital" : "";

/** @type {import("next").NextConfig} */
const nextConfig = {
  // Carpeta propia para no chocar con `npm run dev` si está corriendo
  ...(pages && { output: "export", trailingSlash: true, distDir: ".next-pages" }),
  basePath,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
