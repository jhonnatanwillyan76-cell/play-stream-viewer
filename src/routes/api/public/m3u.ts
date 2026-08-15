import { createFileRoute } from '@tanstack/react-router'
import { listM3U } from '@/lib/m3u.functions'

export const Route = createFileRoute('/api/public/m3u')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const items = await listM3U()
          return new Response(JSON.stringify(items), {
            headers: {
              'Content-Type': 'application/json',
            },
          })
        } catch (error) {
          return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
            },
          })
        }
      },
    },
  },
})
