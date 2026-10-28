import { readFileSync } from 'node:fs'
import { Readable } from 'node:stream'
import type { ReadableStream as NodeReadableStream } from 'node:stream/web'
import type { IncomingMessage, ServerResponse } from 'node:http'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { GET as tiktok } from './api/tiktok.ts'

// Piper loads the ONNX runtime's wasm files from a CDN; they must match the installed version.
const ortVersion = JSON.parse(readFileSync(new URL('./node_modules/onnxruntime-web/package.json', import.meta.url), 'utf8')).version

/** Serves the Vercel Functions in api/ during `vite dev` and `vite preview`. */
function apiFunctions(): Plugin {
  const handle = async (req: IncomingMessage & { originalUrl?: string }, res: ServerResponse) => {
    const response = await tiktok(new Request(new URL(req.originalUrl ?? req.url ?? '/', 'http://localhost')))
    res.statusCode = response.status
    response.headers.forEach((value, key) => res.setHeader(key, value))
    if (response.body) Readable.fromWeb(response.body as NodeReadableStream).pipe(res)
    else res.end()
  }
  return {
    name: 'api-functions',
    configureServer: (server) => void server.middlewares.use('/api/tiktok', (req, res) => void handle(req, res)),
    configurePreviewServer: (server) => void server.middlewares.use('/api/tiktok', (req, res) => void handle(req, res)),
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiFunctions()],
  define: {
    __ORT_VERSION__: JSON.stringify(ortVersion),
  },
})
