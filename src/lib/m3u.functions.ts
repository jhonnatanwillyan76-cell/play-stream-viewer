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
      const isSeries = group.includes('serie') || group.includes('episodio') || group.includes('season') || group.includes('temporada') || group.includes('multi');
      const isMovie = group.includes('filme') || group.includes('movie') || group.includes('cinema') || group.includes('vod');
      
      if (isSeries) {
        currentItem.type = 'series';
      } else if (isMovie) {
        currentItem.type = 'movie';
      }
      
      // Sometimes type is in the URL or tvg-name (Xtream API structure)
      if (line.includes('movie') || tvgNameMatch?.[1].toLowerCase().includes('movie')) currentItem.type = 'movie';
      if (line.includes('series') || tvgNameMatch?.[1].toLowerCase().includes('series')) currentItem.type = 'series';
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
        const name = item.name?.toLowerCase() || "";
        const url = item.url.toLowerCase();
        
        // Comprehensive live TV filtering
        // Channels in Xtream lists usually have a specific pattern and lack VOD extensions
        const isLive = 
          group.includes('ao vivo') || 
          group.includes('live') || 
          group.includes('canais') || 
          group.includes('abertos') || 
          group.includes('24h') ||
          group.includes('variedades') ||
          group.includes('esportes') ||
          group.includes('noticias') ||
          name.includes('ao vivo') ||
          name.includes('full hd') ||
          name.includes(' (h265)') ||
          (url.includes(':') && !url.includes('/movie/') && !url.includes('/series/') && !url.includes('.mp4') && !url.includes('.mkv') && !url.includes('.avi'));

        // Xtream API links for VOD are very specific
        const isVod = url.includes('/movie/') || url.includes('/series/') || url.includes('.mp4') || url.includes('.mkv') || url.includes('.avi');
        
        // Strict requirement: Only movies and series
        if (isVod) return true;
        
        return !isLive;
      });
    } catch (e) {
      console.error("Failed to fetch M3U:", e);
      return [];
    }
  });
