import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { listM3U } from "@/lib/m3u.functions";

export const Route = createFileRoute('/api/public/m3u-test')({
  server: {
    handlers: {
      GET: async () => {
        const url = "http://ph2.lat/get.php?username=334449926&password=427429973&type=m3u_plus&output=ts";
        try {
           const res = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          });
          const text = await res.text();
          return new Response(JSON.stringify({
            status: res.status,
            bodyStart: text.substring(0, 1000),
            length: text.length
          }), { headers: { 'Content-Type': 'application/json' } });
        } catch (e) {
          return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
        }
      }
    }
  }
})

import { createFileRoute } from '@tanstack/react-router'
