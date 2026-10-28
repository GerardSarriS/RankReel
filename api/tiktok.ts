/**
 * GET /api/tiktok?url=<TikTok video link>
 *
 * Returns the video as an MP4 (without watermark). Runs as a Vercel Function in production and
 * as a Vite middleware in development. Browsers can't do this themselves: TikTok's pages and
 * video CDN don't allow cross-origin requests and the CDN needs the page's cookies.
 */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36'

const PAGE_HOSTS = /^(www\.|m\.|vm\.|vt\.)?tiktok\.com$/
// Only fetch video bytes from TikTok's CDNs or the fallback service, never from arbitrary hosts.
const VIDEO_HOSTS = /(^|\.)(tiktok\.com|tiktokcdn\.com|tiktokcdn-us\.com|tiktokv\.com|tikwm\.com)$/

class UserError extends Error {}

interface Video {
  body: ReadableStream<Uint8Array>
  size: string | null
  name: string
}

function parseLink(raw: string | null): URL {
  if (!raw) throw new UserError('Falta el enlace.')
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    throw new UserError('Eso no parece un enlace.')
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new UserError('Eso no parece un enlace.')
  if (!PAGE_HOSTS.test(url.hostname)) throw new UserError('El enlace tiene que ser de tiktok.com.')
  url.protocol = 'https:'
  return url
}

async function fetchVideo(src: string, headers: Record<string, string>, name: string): Promise<Video> {
  if (!VIDEO_HOSTS.test(new URL(src).hostname)) throw new Error(`Host de vídeo inesperado: ${new URL(src).hostname}`)
  const res = await fetch(src, { headers: { 'user-agent': UA, ...headers } })
  const type = res.headers.get('content-type') ?? ''
  if (!res.ok || !res.body || !(type.startsWith('video/') || type === 'application/octet-stream')) {
    throw new Error(`El vídeo respondió ${res.status} (${type})`)
  }
  return { body: res.body, size: res.headers.get('content-length'), name }
}

/** Reads the video address from the data TikTok embeds in the video page. */
async function fromTikTok(link: URL): Promise<Video> {
  const page = await fetch(link, { headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9' }, redirect: 'follow' })
  if (!PAGE_HOSTS.test(new URL(page.url).hostname)) throw new Error('Redirección fuera de TikTok')
  const html = await page.text()
  const json = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/)?.[1]
  if (!json) throw new Error('La página no trae los datos del vídeo')
  const item = JSON.parse(json).__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct
  if (!item) throw new Error('No se encuentra el vídeo en la página')
  if (item.imagePost) throw new UserError('Ese TikTok es un carrusel de fotos, no un vídeo.')
  const src: string | undefined = item.video?.playAddr || item.video?.downloadAddr
  if (!src) throw new Error('El vídeo no tiene dirección de descarga')
  const cookie = page.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ')
  return fetchVideo(src, { referer: 'https://www.tiktok.com/', cookie }, `tiktok-${item.author?.uniqueId ?? 'video'}-${item.id}.mp4`)
}

/** Fallback through tikwm.com when TikTok blocks the direct route. */
async function fromTikwm(link: URL): Promise<Video> {
  const res = await fetch(`https://www.tikwm.com/api/?hd=1&url=${encodeURIComponent(link.href)}`, { headers: { 'user-agent': UA } })
  const json = (await res.json()) as {
    code: number
    msg?: string
    data?: { id: string; play?: string; hdplay?: string; images?: unknown[]; author?: { unique_id?: string } }
  }
  if (json.code !== 0 || !json.data) throw new Error(json.msg ?? 'tikwm no ha respondido')
  if (json.data.images?.length) throw new UserError('Ese TikTok es un carrusel de fotos, no un vídeo.')
  const src = json.data.hdplay || json.data.play
  if (!src) throw new Error('tikwm no devuelve el vídeo')
  return fetchVideo(new URL(src, 'https://www.tikwm.com').href, {}, `tiktok-${json.data.author?.unique_id ?? 'video'}-${json.data.id}.mp4`)
}

const jsonError = (status: number, error: string) =>
  new Response(JSON.stringify({ error }), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

export async function GET(request: Request): Promise<Response> {
  let link: URL
  try {
    link = parseLink(new URL(request.url).searchParams.get('url'))
  } catch (e) {
    return jsonError(400, (e as Error).message)
  }

  let video: Video | null = null
  const problems: string[] = []
  for (const source of [fromTikTok, fromTikwm]) {
    try {
      video = await source(link)
      break
    } catch (e) {
      if (e instanceof UserError) return jsonError(400, e.message)
      problems.push((e as Error).message)
    }
  }
  if (!video) {
    console.error('tiktok download failed', link.href, problems)
    return jsonError(502, 'No se ha podido descargar el vídeo. Comprueba que el enlace es público e inténtalo de nuevo.')
  }

  const headers: Record<string, string> = {
    'content-type': 'video/mp4',
    'content-disposition': `attachment; filename="${video.name.replace(/[^\w.-]/g, '_')}"`,
    'cache-control': 'no-store',
  }
  if (video.size) headers['content-length'] = video.size
  return new Response(video.body, { headers })
}
