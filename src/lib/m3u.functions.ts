import { createServerFn } from "@tanstack/react-start";

export interface M3UItem {
  name: string;
  url: string;
  logo?: string;
  group?: string;
  type: 'movie' | 'series';
  slug: string;
  episodes?: { name: string; url: string }[];
}

const M3U_URL = "http://ph2.lat/get.php?username=334449926&password=427429973&type=m3u_plus&output=ts";
const CACHE_TTL = 30 * 60 * 1000; 

function parseM3U(content: string): M3UItem[] {
  const items: M3UItem[] = [];
  const lines = content.split('\n');
  let currentItem: Partial<M3UItem> | null = null;

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      const nameMatch = line.match(/,(.+)$/);
      const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
      const groupMatch = line.match(/group-title="([^"]+)"/i);
      const tvgNameMatch = line.match(/tvg-name="([^"]+)"/i);
      
      const rawName = nameMatch ? nameMatch[1].trim() : (tvgNameMatch ? tvgNameMatch[1].trim() : "Sem nome");
      
      currentItem = {
        name: rawName,
        logo: logoMatch ? logoMatch[1] : undefined,
        group: groupMatch ? groupMatch[1] : undefined,
        type: 'movie'
      };

      const group = (currentItem.group || "").toLowerCase();
      const name = (currentItem.name || "").toLowerCase();
      const seriesMarkers = ['serie', 'episodio', 'season', 'temporada', 'multi', 's0', 'e0', 's1', 'e1'];
      const isSeries = seriesMarkers.some(m => group.includes(m) || name.includes(m));
      
      currentItem.type = isSeries ? 'series' : 'movie';
      
      if (line.toLowerCase().includes('movie')) currentItem.type = 'movie';
      if (line.toLowerCase().includes('series')) currentItem.type = 'series';
    } else if (line.startsWith('http') && currentItem) {
      currentItem.url = line;
      items.push(currentItem as M3UItem);
      currentItem = null;
    }
  }
  return items;
}

let memoryCache: { data: M3UItem[], timestamp: number } | null = null;

export const listM3U = createServerFn({ method: "GET" })
  .handler(async () => {
    const url = process.env['M3U_URL'] || M3U_URL;
    
    if (memoryCache && (Date.now() - memoryCache.timestamp < CACHE_TTL)) {
      return memoryCache.data;
    }

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(20000)
      });
      
      if (!res.ok) throw new Error(`Fetch M3U failed`);
      const text = await res.text();
      
      if (text.includes('DOWNLOAD_LIMIT_REACHED')) {
        if (memoryCache) return memoryCache.data;
        throw new Error('LIMIT_REACHED');
      }
      
      const allItems = parseM3U(text);
      const filteredItems = allItems.filter(item => {
        const url = item.url.toLowerCase();
        return (url.includes('/movie/') || url.includes('/series/') || url.includes('.mp4') || url.includes('.mkv')) && !url.includes('/live/');
      });

      if (filteredItems.length > 0) {
        memoryCache = { data: filteredItems, timestamp: Date.now() };
      }
      return filteredItems;
    } catch (e) {
      if (memoryCache) return memoryCache.data;
      return [];
    }
  });
