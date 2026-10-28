import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Piper loads the ONNX runtime's wasm files from a CDN; they must match the installed version.
const ortVersion = JSON.parse(readFileSync(new URL('./node_modules/onnxruntime-web/package.json', import.meta.url), 'utf8')).version

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __ORT_VERSION__: JSON.stringify(ortVersion),
  },
})
