import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { buildStamp, buildVersion } from './src/version'

/**
 * Development runs two processes (design D17): `wrangler dev` serves the Worker, and this
 * serves the client and proxies the room to it, because Vite is what gives the client hot
 * reload. The deployed app is one Worker serving both halves from one origin (design D46)
 * — there, `dist/` is the assets binding and this config is not involved.
 */
const WORKER = 'http://localhost:8787'

/**
 * How many commits this history carries, or `null` when that cannot be known — no
 * repository, no git on the machine, a clone with no history. Every one of those must
 * still build (design D60), so the failure is swallowed here and turned into a version
 * that admits it does not know.
 */
function commitCount(): number | null {
  try {
    const out = execFileSync('git', ['rev-list', '--count', 'HEAD'], {
      cwd: fileURLToPath(new URL('.', import.meta.url)),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    const count = Number.parseInt(out.trim(), 10)
    return Number.isInteger(count) ? count : null
  } catch {
    return null
  }
}

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string
}

// Frozen here, at build time: "which build is this" is a question about the artefact, so
// nothing reads git or a clock while the app runs (design D58).
const VERSION = buildVersion(pkg.version, commitCount())
const BUILT_AT = buildStamp(new Date())

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(VERSION),
    __BUILT_AT__: JSON.stringify(BUILT_AT),
  },
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
