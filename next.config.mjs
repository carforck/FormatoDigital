/** @type {import("next").NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  // Rutas absolutas desde la raíz (despliegue en Vercel)
  env: { NEXT_PUBLIC_BASE_PATH: "" },
};

export default nextConfig;
