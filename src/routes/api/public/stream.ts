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
    const upstream = await fetch(parsed.toString(), { 
      method, 
      headers, 
      redirect: 'follow',
      // @ts-ignore - nodejs_compat allows some extra fetch options in some environments
      duplex: 'half' 
    })

    const outHeaders = new Headers()
    
    // Copy essential headers for streaming
    const headersToCopy = [
      'content-type', 
      'content-length', 
      'content-range', 
      'accept-ranges', 
      'cache-control',
      'content-disposition'
    ]

    for (const key of headersToCopy) {
      const value = upstream.headers.get(key)
      if (value) outHeaders.set(key, value)
    }

    // Ensure CORS
    outHeaders.set('Access-Control-Allow-Origin', '*')
    outHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    outHeaders.set('Access-Control-Allow-Headers', '*')
    
    // Fix for infinite loading: some providers need specific content-type for .ts
    if (parsed.pathname.endsWith('.ts') && !outHeaders.has('content-type')) {
      outHeaders.set('content-type', 'video/mp2t')
    }

    if (!outHeaders.has('accept-ranges')) {
      outHeaders.set('accept-ranges', 'bytes')
    }

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
    },
  },
})