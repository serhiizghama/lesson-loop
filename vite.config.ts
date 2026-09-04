import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

/**
 * Two processes in development (design D17): `wrangler dev` serves the Worker, this
 * serves the client and proxies the room to it. How the built client reaches the
 * internet is `add-cloudflare-deploy`, so the Worker serves no assets here.
 */
const WORKER = 'http://localhost:8787'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    proxy: {
      '/api': { target: WORKER, changeOrigin: true },
      '/ws': { target: WORKER, ws: true, changeOrigin: true },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/**/*.test.ts'],
  },
})
