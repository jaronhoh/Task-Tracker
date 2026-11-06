import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

// Embedded metadata describes this actual build, not Sites' latest saved version.
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }
const sourceEpoch = process.env.SOURCE_DATE_EPOCH
const updatedAt = sourceEpoch && /^\d+$/.test(sourceEpoch)
  ? new Date(Number(sourceEpoch) * 1000).toISOString()
  : new Date().toISOString()

export default defineConfig({
  define: { __TASK_TRACKER_BUILD__: JSON.stringify({ version, updatedAt }) },
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: '/react/',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: { outDir: '../public/react', emptyOutDir: true },
  server: { host: '127.0.0.1', proxy: { '/api': 'http://127.0.0.1:3000' } },
})
