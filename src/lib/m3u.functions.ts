import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface M3UItem {
  name: string;
  url: string;
  logo?: string;
  group?: string;
  type: 'movie' | 'series';
}

const M3U_URL = process.env['M3U_URL'] || "http://ph2.lat/get.php?username=334449926&password=427429973&type=m3u_plus&output=ts";

function parseM3U(content: string): M3UItem[] {
  const items: M3UItem[] = [];
  const lines = content.split('\n');
  
  let currentItem: Partial<M3UItem> | null = null;
  
  for (let line of lines) {
    line = line.trim();
    if (line.startsWith('#EXTINF:')) {
      const nameMatch = line.match(/,(.+)$/);
      const logoMatch = line.match(/tvg-logo="([^"]+)"/);
      const groupMatch = line.match(/group-title="([^"]+)"/);
      
      currentItem = {
        name: nameMatch ? nameMatch[1].trim() : "Sem nome",
        logo: logoMatch ? logoMatch[1] : undefined,
        group: groupMatch ? groupMatch[1] : undefined,
        type: 'movie' // Default, can be refined by group-title
      };

      if (currentItem.group?.toLowerCase().includes('serie')) {
        currentItem.type = 'series';
      }
    } else if (line.startsWith('http') && currentItem) {
      currentItem.url = line;
      items.push(currentItem as M3UItem);
      currentItem = null;
    }
  }
  
  return items;
}

export const listM3U = createServerFn({ method: "GET" })
  .handler(async () => {
    const url = process.env['M3U_URL'] || "http://ph2.lat/get.php?username=334449926&password=427429973&type=m3u_plus&output=ts";
    
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Fetch M3U failed: ${res.status}`);
      const text = await res.text();
      return parseM3U(text);
    } catch (e) {
      console.error("Failed to fetch M3U:", e);
      return [];
    }
  });
