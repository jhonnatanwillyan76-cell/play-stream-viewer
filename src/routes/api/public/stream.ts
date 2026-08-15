import { createFileRoute } from '@tanstack/react-router'

const ALLOWED_HOSTS = ['ph2.lat']

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
  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return new Response('Host not allowed', { status: 403 })
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
    console.log(`Proxying: ${parsed.toString()}`);
    const upstream = await fetch(parsed.toString(), { 
      method, 
      headers, 
      redirect: 'follow',
    })
    console.log(`Upstream status: ${upstream.status} ${upstream.statusText}`);
    console.log(`Upstream headers: ${JSON.stringify(Object.fromEntries(upstream.headers.entries()))}`);

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
    if (parsed.pathname.endsWith('.ts')) {
      outHeaders.set('content-type', 'video/mp2t')
    } else if (parsed.pathname.endsWith('.mp4')) {
      outHeaders.set('content-type', 'video/mp4')
    }

    // Return the response with the exact status code from upstream (crucial for 206 Partial Content)
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
