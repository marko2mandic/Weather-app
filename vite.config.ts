import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const DAY = 24 * 60 * 60

// base matches the GitHub Pages path: https://marko2mandic.github.io/Weather-app/
export default defineConfig({
  base: '/Weather-app/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.svg'],
      manifest: {
        name: 'Toddler Weather',
        short_name: 'Weather',
        description: 'Hyper-local weather for outings with little ones: rain by the minute, what to wear, and what to do.',
        lang: 'en',
        start_url: '/Weather-app/',
        scope: '/Weather-app/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1c0f45',
        theme_color: '#2a1660',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallback: '/Weather-app/index.html',
        runtimeCaching: [
          // Forecast: always try fresh, fall back to the last one when offline
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'forecast', networkTimeoutSeconds: 6, expiration: { maxEntries: 20, maxAgeSeconds: DAY } },
          },
          // Map base tiles: modest cache so the home map opens instantly
          {
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\//,
            handler: 'CacheFirst',
            options: { cacheName: 'map-tiles', expiration: { maxEntries: 150, maxAgeSeconds: 14 * DAY } },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 10, maxAgeSeconds: 365 * DAY } },
          },
          // Radar/satellite change every few minutes: never serve stale imagery
          { urlPattern: /^https:\/\/(maps\.dwd\.de|view\.eumetsat\.int)\//, handler: 'NetworkOnly' },
          // Supabase (auth, family data) is never cached by the service worker
          { urlPattern: /^https:\/\/[a-z0-9]+\.supabase\.co\//, handler: 'NetworkOnly' },
        ],
      },
    }),
  ],
})
