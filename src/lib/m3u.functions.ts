import { createServerFn } from "@tanstack/react-start";

export interface M3UItem {
  name: string;
  url: string;
  logo?: string;
  group?: string;
  type: 'movie' | 'series';
}

const M3U_URL = "http://ph2.lat/get.php?username=334449926&password=427429973&type=m3u_plus&output=ts";
const CACHE_KEY = "m3u_catalog_cache";
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes cache to avoid limit errors


function parseM3U(content: string): M3UItem[] {
  const items: M3UItem[] = [];
  const lines = content.split('\n');
  
  let currentItem: Partial<M3UItem> | null = null;
  
  console.log("Parsing M3U content, lines:", lines.length);

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
      
      // Better series detection: check for season/episode markers in name too
      const seriesMarkers = ['serie', 'episodio', 'season', 'temporada', 'multi', 's0', 'e0', 's1', 'e1'];
      const isSeries = seriesMarkers.some(m => group.includes(m) || name.includes(m));
      
      if (isSeries) {
        currentItem.type = 'series';
      } else {
        currentItem.type = 'movie';
      }
      
      // Override if specific markers found in line
      if (line.toLowerCase().includes('movie')) currentItem.type = 'movie';
      if (line.toLowerCase().includes('series')) currentItem.type = 'series';

    } else if (line.startsWith('http') && currentItem) {
      currentItem.url = line;
      items.push(currentItem as M3UItem);
      currentItem = null;
    }
  }
  
  console.log("Parsed total items:", items.length);
  return items;
}

let memoryCache: { data: M3UItem[], timestamp: number } | null = null;

export const listM3U = createServerFn({ method: "GET" })
  .handler(async () => {
    const url = process.env['M3U_URL'] || M3U_URL;
    
    // Return from memory cache if valid
    if (memoryCache && (Date.now() - memoryCache.timestamp < CACHE_TTL)) {
      console.log("Serving M3U from memory cache");
      return memoryCache.data;
    }

    try {
      console.log("Fetching M3U from provider...");
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Connection': 'keep-alive'
        },
        signal: AbortSignal.timeout(15000)
      });
      
      if (!res.ok) throw new Error(`Fetch M3U failed: ${res.status}`);
      const text = await res.text();
      
      if (text.includes('DOWNLOAD_LIMIT_REACHED')) {
        if (memoryCache) {
          console.warn("Limit reached, serving stale cache");
          return memoryCache.data;
        }
        throw new Error('Limite de download simultâneo atingido na lista M3U. Tente novamente em instantes.');
      }
      
      const allItems = parseM3U(text);
      
      const filteredItems = allItems.filter(item => {
        const url = item.url.toLowerCase();
        const isMovieLink = url.includes('/movie/');
        const isSeriesLink = url.includes('/series/');
        const hasVideoExt = url.includes('.mp4') || url.includes('.mkv') || url.includes('.avi');
        const isLive = url.includes('/live/');
        if (isLive) return false;
        return isMovieLink || isSeriesLink || hasVideoExt;
      });

      // Update cache
      if (filteredItems.length > 0) {
        memoryCache = {
          data: filteredItems,
          timestamp: Date.now()
        };
      }

      return filteredItems;
    } catch (e) {
      console.error("Failed to fetch M3U:", e);
      if (memoryCache) {
        console.warn("Fetch failed, serving stale cache");
        return memoryCache.data;
      }
      return [];
    }
  });
