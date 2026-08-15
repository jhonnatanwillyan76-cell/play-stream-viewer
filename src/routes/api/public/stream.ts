import { createFileRoute } from '@tanstack/react-router'

const ALLOWED_HOSTS = ['ph2.lat', 'livecreative.digital', 'cdn.livecreative.digital', 'edge.livecreative.digital', 'streaming.ph2.lat']

async function proxy(request: Request, method: 'GET' | 'HEAD') {
  console.log(`[PROXY] Request: ${method} ${request.url}`);
  const rangeHeader = request.headers.get('range');
  if (rangeHeader) console.log(`[PROXY] Range requested: ${rangeHeader}`);

  const url = new URL(request.url)
  const target = url.searchParams.get('url')
  if (!target) return new Response('Missing url', { status: 400 })

  let parsed: URL
  try {
    parsed = new URL(target)
  } catch {
    return new Response('Invalid url', { status: 400 })
  }
  const isAllowedHost = ALLOWED_HOSTS.some(h => parsed.hostname.endsWith(h));
  if (!isAllowedHost) {
    // If it's not in the list, but it's a known streaming extension, we might want to allow it
    const isMedia = ['.mp4', '.ts', '.m3u8', '.mkv'].some(ext => parsed.pathname.toLowerCase().endsWith(ext));
    if (!isMedia) {
      return new Response('Host not allowed', { status: 403 })
    }
  }

  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Referer': 'http://ph2.lat/',
    'Origin': 'http://ph2.lat',
  }

  const range = request.headers.get('range')
  if (range) headers['Range'] = range

  try {
    const upstream = await fetch(parsed.toString(), { 
      method, 
      headers, 
      redirect: 'follow',
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
      'etag'
    ]

    for (const key of headersToCopy) {
      const value = upstream.headers.get(key)
      if (value) outHeaders.set(key, value)
    }

    // Ensure CORS
    outHeaders.set('Access-Control-Allow-Origin', '*')
    outHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    outHeaders.set('Access-Control-Allow-Headers', '*')
    outHeaders.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges')
    
    // Explicitly set content-type if missing or incorrect for common formats
    const contentType = outHeaders.get('content-type');
    if (!contentType || contentType === 'text/plain') {
      if (parsed.pathname.endsWith('.ts')) {
        outHeaders.set('content-type', 'video/mp2t');
      } else if (parsed.pathname.endsWith('.mp4')) {
        outHeaders.set('content-type', 'video/mp4');
      } else if (parsed.pathname.endsWith('.m3u8')) {
        outHeaders.set('content-type', 'application/x-mpegURL');
      }
    }
    
    console.log(`[PROXY] Final content-type: ${outHeaders.get('content-type')}`);
    console.log(`[PROXY] Final status: ${upstream.status}`);


    // Return the response with the exact status code from upstream (crucial for 206 Partial Content)
    return new Response(method === 'HEAD' ? null : upstream.body, {
      status: upstream.status,
      headers: outHeaders,
    })
  } catch (error: any) {
    console.error('[PROXY] Error:', error.message || error);
    return new Response('Proxy error: ' + (error.message || 'Unknown'), { status: 502 })
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
