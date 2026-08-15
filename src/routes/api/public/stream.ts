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
    'User-Agent': 'VLC/3.0.20 LibVLC/3.0.20',
    Accept: '*/*',
  }
  const range = request.headers.get('range')
  if (range) headers['Range'] = range

  const upstream = await fetch(parsed.toString(), { method, headers, redirect: 'follow' })

  const outHeaders = new Headers()
  for (const key of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'cache-control']) {
    const value = upstream.headers.get(key)
    if (value) outHeaders.set(key, value)
  }
  if (!outHeaders.has('accept-ranges')) outHeaders.set('accept-ranges', 'bytes')
  outHeaders.set('access-control-allow-origin', '*')

  return new Response(method === 'HEAD' ? null : upstream.body, {
    status: upstream.status,
    headers: outHeaders,
  })
}

export const Route = createFileRoute('/api/public/stream')({
  server: {
    handlers: {
      GET: ({ request }) => proxy(request, 'GET'),
      HEAD: ({ request }) => proxy(request, 'HEAD'),
    },
  },
})