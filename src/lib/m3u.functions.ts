import { createServerFn } from "@tanstack/react-start";

export interface M3UItem {
  name: string;
  url: string;
  logo?: string;
  group?: string;
  type: 'movie' | 'series';
  slug: string;
  episodes?: { name: string; url: string }[];
  variants?: { label: string; url: string; compatible: boolean }[];
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

// Streams em 4K/HDR normalmente são HEVC (H.265) + áudio E-AC3, que a maioria
// dos navegadores não decodifica: o usuário ouve o áudio e não vê a imagem.
// Por isso priorizamos versões compatíveis (1080p/720p H.264).
export function isBrowserCompatible(name: string): boolean {
  const n = name.toLowerCase();
  return !/(4k|uhd|2160p|hdr|hevc|h\.?265|x265|dolby\s*vision|\bdv\b|hybrid)/.test(n);
}

function getQualityScore(name: string): number {
  const n = name.toLowerCase();
  let score = 40;
  if (n.includes('1080p') || n.includes('fhd') || n.includes('bluray')) score = 80;
  else if (n.includes('720p') || n.includes('hd')) score = 60;
  else if (n.includes('hdtv')) score = 50;
  else if (n.includes('cam') || n.includes('hc')) score = 10;
  else if (n.includes('4k') || n.includes('uhd') || n.includes('2160p')) score = 70;
  // Incompatível com navegador (HEVC/HDR) fica sempre atrás
  if (!isBrowserCompatible(name)) score -= 1000;
  return score;
}

function cleanMovieName(name: string): string {
  return name
    .replace(/\d{3,4}p/gi, '')
    .replace(/4k|uhd|fhd|hd|bluray|brrip|webrip|web-dl|hdtv|cam|ts|hc/gi, '')
    .replace(/\[.*?\]|\(.*?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function upgradeLogoQuality(logo?: string): string | undefined {
  if (!logo) return undefined;
  // Upgrade TMDB resolution from w300/w600/etc to original or w780
  if (logo.includes('tmdb.org')) {
    return logo.replace(/\/t\/p\/w\d+(_and_h\d+(_bestv2)?)?/, '/t/p/original');
  }
  return logo;
}

function parseM3U(content: string): M3UItem[] {
  const movieMap = new Map<string, M3UItem & { quality: number }>();
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
        logo: upgradeLogoQuality(logoMatch ? logoMatch[1] : undefined),
        group: groupMatch ? groupMatch[1] : undefined,
        type: 'movie'
      };

      const group = (currentItem.group || "").toLowerCase();
      const name = (currentItem.name || "").toLowerCase();
      
      const seriesMarkers = ['serie', 'episodio', 'season', 'temporada', ' s0', ' e0', ' s1', ' e1', ' s2', ' e2', ' s3', ' e3'];
      const isSeries = seriesMarkers.some(m => group.includes(m) || name.includes(m));
      
      currentItem.type = isSeries ? 'series' : 'movie';
    } else if (line.startsWith('http') && currentItem) {
      currentItem.url = line;
      const url = line.toLowerCase();
      
      if (url.includes('/movie/')) currentItem.type = 'movie';
      else if (url.includes('/series/')) currentItem.type = 'series';
      
      if (currentItem.type === 'series') {
        let baseName = currentItem.name!
          .replace(/[Ss]\d+[Ee]\d+/g, '')
          .replace(/[Ss]eason\s*\d+/gi, '')
          .replace(/[Tt]emporada\s*\d+/gi, '')
          .replace(/[Ee]p\.\s*\d+/gi, '')
          .replace(/[Ee]pis[óo]dio\s*\d+/gi, '')
          .replace(/[\(\[].*?[\)\]]/g, '')
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
        const cleanedName = cleanMovieName(currentItem.name!);
        const slug = slugify(cleanedName || currentItem.name!);
        const quality = getQualityScore(currentItem.name!);
        const variant = {
          label: currentItem.rawName || currentItem.name!,
          url: line,
          compatible: isBrowserCompatible(currentItem.rawName || currentItem.name!),
        };

        const existing = movieMap.get(slug);
        if (existing) {
          existing.variants!.push(variant);
          if (quality > existing.quality) {
            const variants = existing.variants!;
            movieMap.set(slug, {
              ...(currentItem as M3UItem),
              name: cleanedName,
              slug,
              quality,
              variants,
            } as M3UItem & { quality: number });
          }
        } else {
          movieMap.set(slug, {
            ...(currentItem as M3UItem),
            name: cleanedName,
            slug,
            quality,
            variants: [variant],
          } as M3UItem & { quality: number });
        }
      }
      currentItem = null;
    }
  }
  
  return [
    ...Array.from(movieMap.values()).map(({ quality, ...rest }) => ({
      ...rest,
      variants: (rest.variants ?? []).sort(
        (a, b) => Number(b.compatible) - Number(a.compatible),
      ),
    })),
    ...Array.from(seriesMap.values()),
  ];
}

let memoryCache: { data: M3UItem[], timestamp: number } | null = null;
const CACHE_FILE = '/tmp/m3u_cache_v2.json';

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
        console.warn('Provider LIMIT_REACHED detected in response');
        const stale = await getCachedData();
        if (stale) {
          console.log('Serving STALE data due to LIMIT_REACHED');
        return stale.sort((a: M3UItem, b: M3UItem) => a.name.localeCompare(b.name, undefined, { numeric: true }));
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
      return filteredItems.sort((a: M3UItem, b: M3UItem) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    } catch (e) {
      console.error('SERVER FN ERROR:', e);
      const stale = await getCachedData();
      if (stale) {
        console.log('Serving STALE data from cache due to error');
        return stale.sort((a: M3UItem, b: M3UItem) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      }
      return [];
    }
  });
