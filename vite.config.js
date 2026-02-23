import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // ── Base para GitHub Pages ─────────────────────────────────────────
  // Cambia 'rutas-optimizadas' por el nombre exacto de tu repositorio en GitHub.
  base: process.env.NODE_ENV === 'production' ? '/rutas-optimizadas/' : '/',

  // ─── Proxies de desarrollo (evitan CORS en navegador) ─────────
  server: {
    proxy: {
      // OpenRouteService → optimización de rutas
      '/api/ors': {
        target: 'https://api.openrouteservice.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ors/, ''),
        secure: true,
      },
      // Nominatim → geocodificación de direcciones
      '/api/nominatim': {
        target: 'https://nominatim.openstreetmap.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nominatim/, ''),
        secure: true,
        headers: {
          // Nominatim requiere un User-Agent real o rechaza la petición
          'User-Agent': 'DespachoRapidosPWA/1.0 (dev-proxy)',
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Equipo Total — Rutas",
        short_name: "Equipo Total",
        description: "Optimización de rutas de entrega para repartidores",
        theme_color: "#9b1c1c",
        background_color: "#100808",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/nominatim\.openstreetmap\.org\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "nominatim-cache",
              expiration: { maxEntries: 200, maxAgeSeconds: 86400 },
            },
          },
          {
            urlPattern: /^https:\/\/[a-c]\.tile\.openstreetmap\.org\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "osm-tiles",
              expiration: { maxEntries: 500, maxAgeSeconds: 604800 },
            },
          },
        ],
      },
    }),
  ],
});
