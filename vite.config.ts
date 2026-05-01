import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const aliasEntries = {
  '@': fileURLToPath(new URL('./src', import.meta.url)),
  '@assets': fileURLToPath(new URL('./src/assets', import.meta.url)),
  '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
  '@contexts': fileURLToPath(new URL('./src/contexts', import.meta.url)),
  '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
  '@hooks': fileURLToPath(new URL('./src/hooks', import.meta.url)),
  '@screens': fileURLToPath(new URL('./src/screens', import.meta.url)),
  '@services': fileURLToPath(new URL('./src/services', import.meta.url)),
  '@types': fileURLToPath(new URL('./src/types', import.meta.url)),
  '@utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'logo.svg', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'MOC Request',
        short_name: 'MOC Request',
        description: 'Multi-workspace request intake with department routing.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/logo.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/auth\//],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: aliasEntries,
  },
})
