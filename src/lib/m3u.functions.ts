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
const CACHE_TTL = 6 * 60 * 60 * 1000; // Increased to 6 hours for stability 

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseM3U(content: string): M3UItem[] {
  const items: M3UItem[] = [];
  const seriesMap = new Map<string, M3UItem>();
  const lines = content.split('\n');
  let currentItem: Partial<M3UItem> & { rawName?: string } | null = null;

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
        rawName: rawName,
        logo: logoMatch ? logoMatch[1] : undefined,
        group: groupMatch ? groupMatch[1] : undefined,
        type: 'movie'
      };

      const group = (currentItem.group || "").toLowerCase();
      const name = (currentItem.name || "").toLowerCase();
      
      // Detecção de série mais rigorosa para evitar filmes nas séries
      const seriesMarkers = ['serie', 'episodio', 'season', 'temporada', ' s0', ' e0', ' s1', ' e1', ' s2', ' e2', ' s3', ' e3'];
      const isSeries = seriesMarkers.some(m => group.includes(m) || name.includes(m));
      
      currentItem.type = isSeries ? 'series' : 'movie';
      
      // Priorizar marcações explícitas da URL se disponíveis
      // Mas o loop INFINF ainda não tem a URL aqui. A URL vem na próxima linha.
      // Vamos ajustar a lógica no bloco 'else if (line.startsWith('http'))'
    } else if (line.startsWith('http') && currentItem) {
      currentItem.url = line;
      const url = line.toLowerCase();
      
      // Correção final baseada na URL
      if (url.includes('/movie/')) currentItem.type = 'movie';
      else if (url.includes('/series/')) currentItem.type = 'series';
      
      if (currentItem.type === 'series') {
        // Tentar limpar o nome da série removendo marcações de episódios
        // Ex: "The Boys S01 E01" -> "The Boys"
        let baseName = currentItem.name!
          .replace(/[Ss]\d+[Ee]\d+/g, '') // S01E01
          .replace(/[Ss]eason\s*\d+/gi, '') // Season 1
          .replace(/[Tt]emporada\s*\d+/gi, '') // Temporada 1
          .replace(/[Ee]p\.\s*\d+/gi, '') // Ep. 1
          .replace(/[Ee]pis[óo]dio\s*\d+/gi, '') // Episodio 1
          .replace(/[\(\[].*?[\)\]]/g, '') // (Legendado), [Dublado]
          .replace(/\s+/g, ' ')
          .trim();

        const slug = slugify(baseName || currentItem.name!);
        
        if (seriesMap.has(slug)) {
          const existing = seriesMap.get(slug)!;
          existing.episodes!.push({ name: currentItem.name!, url: line });
        } else {
          const newItem: M3UItem = {
            ...currentItem,
            name: baseName || currentItem.name!,
            slug,
            url: line,
            episodes: [{ name: currentItem.name!, url: line }]
          } as M3UItem;
          seriesMap.set(slug, newItem);
        }
      } else {
        const slug = slugify(currentItem.name!);
        items.push({ ...currentItem, slug } as M3UItem);
      }
      currentItem = null;
    }
  }
  
  return [...items, ...Array.from(seriesMap.values())];
}

let memoryCache: { data: M3UItem[], timestamp: number } | null = null;
const CACHE_FILE = '/tmp/m3u_cache.json';

async function getCachedData() {
  if (memoryCache && (Date.now() - memoryCache.timestamp < CACHE_TTL)) {
    return memoryCache.data;
  }
  
  try {
    const fs = await import('fs/promises');
    const data = JSON.parse(await fs.readFile(CACHE_FILE, 'utf-8'));
    memoryCache = { data, timestamp: Date.now() }; // Treat as fresh in memory for this session
    return data;
  } catch (e) {
    console.error('getCachedData error:', e);
  }
  return null;
}

async function setCachedData(data: M3UItem[]) {
  memoryCache = { data, timestamp: Date.now() };
  try {
    const fs = await import('fs/promises');
    await fs.writeFile(CACHE_FILE, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to write M3U cache file', e);
  }
}

export const listM3U = createServerFn({ method: "GET" })
  .handler(async () => {
    const url = process.env['M3U_URL'] || M3U_URL;
    
    const cached = await getCachedData();
    if (cached) return cached;

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(30000)
      });
      
      if (!res.ok) throw new Error(`Fetch M3U failed`);
      const text = await res.text();
      
      if (text.includes('DOWNLOAD_LIMIT_REACHED')) {
        const stale = await getCachedData();
        if (stale) return stale;
        console.warn('Provider LIMIT_REACHED detected in response');
        const stale = await getCachedData();
        if (stale) {
           console.log('Serving STALE data due to LIMIT_REACHED');
           return stale;
        }
        throw new Error('LIMIT_REACHED');
      }
      
      const allItems = parseM3U(text);
      const filteredItems = allItems.filter(item => {
        const url = item.url.toLowerCase();
        const group = (item.group || "").toLowerCase();
        const name = (item.name || "").toLowerCase();
        
        // Bloquear conteúdo adulto
        const adultKeywords = ['xxx', 'adulto', 'porn', 'sexo', 'hentai', 'hot', 'erotico', 'erotica', '18+'];
        const isAdult = adultKeywords.some(k => group.includes(k) || name.includes(k) || url.includes(k));
        if (isAdult) return false;

        return (url.includes('/movie/') || url.includes('/series/') || url.includes('.mp4') || url.includes('.mkv')) && !url.includes('/live/');
      });

      filteredItems.forEach(item => {
        if (item.type === 'series' && item.episodes) {
          item.episodes.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
        }
      });

      if (filteredItems.length > 0) {
        await setCachedData(filteredItems);
      }
      return filteredItems;
    } catch (e) {
      console.error('SERVER FN ERROR:', e);
      const stale = await getCachedData();
      if (stale) {
        console.log('Serving STALE data from cache due to error');
        return stale;
      }
      return [];
    }
  });
