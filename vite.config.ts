import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { MOCK_TABLES, type MockDataBundle, type MockPasswords, type MockRow, type MockTable } from './src/data/mock-schema'

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

const mockDataEndpoint = '/api/mock-data'
const mockTableFiles = Object.fromEntries(
  MOCK_TABLES.map(table => [table, `${table}.json`]),
) as Record<MockTable, string>

type MockDataPatch = {
  tables?: Partial<Record<MockTable, MockRow[]>>
  passwords?: MockPasswords
}

function mockDataPlugin(): Plugin {
  function filePathFor(root: string, fileName: string): string {
    return resolve(root, 'src/data/mocks', fileName)
  }

  async function readJson<T>(filePath: string): Promise<T> {
    const content = await readFile(filePath, 'utf8')
    return JSON.parse(content) as T
  }

  async function writeJson(filePath: string, value: unknown): Promise<void> {
    await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  }

  async function readBundle(root: string): Promise<MockDataBundle> {
    const tables = {} as MockDataBundle['tables']

    for (const table of MOCK_TABLES) {
      tables[table] = await readJson<MockRow[]>(filePathFor(root, mockTableFiles[table]))
    }

    const passwords = await readJson<MockPasswords>(filePathFor(root, 'passwords.json'))
    return { tables, passwords }
  }

  async function parseBody(request: IncomingMessage): Promise<MockDataPatch> {
    const chunks: Buffer[] = []

    for await (const chunk of request) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }

    if (chunks.length === 0) return {}
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as MockDataPatch
  }

  function sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
    response.statusCode = statusCode
    response.setHeader('Content-Type', 'application/json')
    response.end(JSON.stringify(payload))
  }

  function createMiddleware(root: string) {
    return async function mockDataMiddleware(
      request: IncomingMessage,
      response: ServerResponse,
      next: () => void,
    ) {
      const pathname = request.url ? new URL(request.url, 'http://localhost').pathname : null
      if (pathname !== mockDataEndpoint) {
        next()
        return
      }

      try {
        if (request.method === 'GET') {
          sendJson(response, 200, await readBundle(root))
          return
        }

        if (request.method === 'PATCH') {
          const patch = await parseBody(request)

          if (patch.tables) {
            for (const [table, rows] of Object.entries(patch.tables) as [MockTable, MockRow[] | undefined][]) {
              if (!rows) continue
              await writeJson(filePathFor(root, mockTableFiles[table]), rows)
            }
          }

          if (patch.passwords) {
            await writeJson(filePathFor(root, 'passwords.json'), patch.passwords)
          }

          sendJson(response, 200, { ok: true })
          return
        }

        sendJson(response, 405, { error: 'Method not allowed' })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown mock data error'
        sendJson(response, 500, { error: message })
      }
    }
  }

  return {
    name: 'mock-data-api',
    configureServer(server) {
      server.middlewares.use(createMiddleware(server.config.root))
    },
    configurePreviewServer(server) {
      server.middlewares.use(createMiddleware(server.config.root))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    mockDataPlugin(),
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
