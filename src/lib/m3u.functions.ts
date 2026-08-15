import { createServerFn } from "@tanstack/react-start";

export interface M3UItem {
  name: string;
  url: string;
  logo?: string;
  group?: string;
  type: 'movie' | 'series';
}

const M3U_URL = "http://ph2.lat/get.php?username=334449926&password=427429973&type=m3u_plus&output=ts";

function parseM3U(content: string): M3UItem[] {
  const items: M3UItem[] = [];
  const lines = content.split('\n');
  
  let currentItem: Partial<M3UItem> | null = null;
  
  for (let line of lines) {
    line = line.trim();
    if (line.startsWith('#EXTINF:')) {
      const nameMatch = line.match(/,(.+)$/);
      const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
      const groupMatch = line.match(/group-title="([^"]+)"/i);
      const tvgNameMatch = line.match(/tvg-name="([^"]+)"/i);
      
      currentItem = {
        name: nameMatch ? nameMatch[1].trim() : (tvgNameMatch ? tvgNameMatch[1].trim() : "Sem nome"),
        logo: logoMatch ? logoMatch[1] : undefined,
        group: groupMatch ? groupMatch[1] : undefined,
        type: 'movie'
      };

      const group = currentItem.group?.toLowerCase() || "";
      const name = currentItem.name?.toLowerCase() || "";
      
      // Smart detection for types
      if (group.includes('serie') || group.includes('episodio') || group.includes('season') || group.includes('temporada') || group.includes('multi')) {
        currentItem.type = 'series';
      } else if (group.includes('filme') || group.includes('movie') || group.includes('cinema') || group.includes('vod')) {
        currentItem.type = 'movie';
      } else if (group.includes('canais') || group.includes('ao vivo') || group.includes('live') || group.includes('tv') || group.includes('abertos')) {
        currentItem.type = 'series'; // We'll treat live TV as 'series' for now or a separate type if needed
        // But the user wants only movies and series, so we might filter these out in the caller
      }
      
      // Sometimes type is in the URL (Xtream API structure)
      if (currentItem.url?.includes('movie')) currentItem.type = 'movie';
      if (currentItem.url?.includes('series')) currentItem.type = 'series';
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
    const url = process.env['M3U_URL'] || M3U_URL;
    
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Connection': 'keep-alive'
        }
      });
      if (!res.ok) throw new Error(`Fetch M3U failed: ${res.status}`);
      const text = await res.text();
      
      if (text.includes('DOWNLOAD_LIMIT_REACHED')) {
        throw new Error('Limite de download simultâneo atingido na lista M3U. Tente novamente em instantes.');
      }
      
      const allItems = parseM3U(text);
      
      // Filter to only include movies and series, excluding live TV channels if any
      // Usually M3U lists from providers have specific group names for VOD
      return allItems.filter(item => {
        const group = item.group?.toLowerCase() || "";
        // Keep items that look like movies or series (VOD)
        // Common M3U tags for live TV usually don't have these, but we'll be inclusive of what looks like VOD
        const isLive = group.includes('ao vivo') || group.includes('live') || group.includes('canais');
        return !isLive;
      });
    } catch (e) {
      console.error("Failed to fetch M3U:", e);
      return [];
    }
  });
