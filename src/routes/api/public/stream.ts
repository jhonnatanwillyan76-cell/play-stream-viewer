import { createFileRoute } from '@tanstack/react-router'

const ALLOWED_HOSTS = [
  'ph2.lat', 
  'livecreative.digital', 
  'cdn.livecreative.digital', 
  'edge.livecreative.digital', 
  'streaming.ph2.lat', 
  'livecreative.net', 
  'livecreative.site', 
  '103.140.155.12',
  'opalivevodsexclusive.click',
  'livevods.xyz',
  'vodsexclusive.online'
]

async function proxy(request: Request, method: 'GET' | 'HEAD') {
  const url = new URL(request.url)
  const target = url.searchParams.get('url')
  if (!target) return new Response('Missing url', { status: 400 })

  let parsed: URL
  try {
    parsed = new URL(target)
  } catch {
    return new Response('Invalid url', { status: 400 })
  }

  // Security check: allow known hosts or common media extensions
  const isAllowedHost = ALLOWED_HOSTS.some(h => parsed.hostname.endsWith(h));
  if (!isAllowedHost) {
    const isMedia = ['.mp4', '.ts', '.m3u8', '.mkv'].some(ext => parsed.pathname.toLowerCase().endsWith(ext));
    if (!isMedia) {
      return new Response('Host not allowed', { status: 403 })
    }
  }

  // Use a User-Agent that commonly bypasses some simple anti-bot/bot-check mechanisms for streaming
  const headers: Record<string, string> = {
    'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
    'Accept': '*/*',
    'Connection': 'keep-alive',
  }

  // Pass through Range header for seeking/partial content
  const range = request.headers.get('range')
  if (range) headers['Range'] = range

  try {
    const upstream = await fetch(parsed.toString(), { 
      method, 
      headers, 
      redirect: 'follow'

    })

    const outHeaders = new Headers()
    
    // Copy essential headers for streaming
    const headersToCopy = [
      'content-type', 
      'content-length', 
      'content-range', 
      'accept-ranges', 
      'cache-control',
      'last-modified',
      'etag',
      'vary'
    ]

    for (const key of headersToCopy) {
      const value = upstream.headers.get(key)
      if (value) outHeaders.set(key, value)
    }

    // Ensure CORS for the browser to allow the video element to read the stream
    outHeaders.set('Access-Control-Allow-Origin', '*')
    outHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    outHeaders.set('Access-Control-Allow-Headers', '*')
    outHeaders.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, ETag, Last-Modified')
    
    // Fallback content-types
    const contentType = outHeaders.get('content-type');
    if (!contentType || contentType === 'text/plain' || contentType === 'text/html') {
      if (parsed.pathname.endsWith('.ts')) {
        outHeaders.set('content-type', 'video/mp2t');
      } else if (parsed.pathname.endsWith('.mp4')) {
        outHeaders.set('content-type', 'video/mp4');
      } else if (parsed.pathname.endsWith('.m3u8')) {
        outHeaders.set('content-type', 'application/x-mpegURL');
      }
    }

    // Return the response, streaming the body if it's a GET request
    return new Response(method === 'HEAD' ? null : upstream.body, {
      status: upstream.status,
      headers: outHeaders,
    })
  } catch (error) {
    console.error('Proxy fetch error:', error)
    return new Response('Proxy error', { status: 502 })
  }
}

export const Route = createFileRoute('/api/public/stream')({
  server: {
    handlers: {
      GET: ({ request }) => proxy(request, 'GET'),
      HEAD: ({ request }) => proxy(request, 'HEAD'),
      OPTIONS: async () => {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Max-Age': '86400',
          }
        })
      }
    },
  },
})