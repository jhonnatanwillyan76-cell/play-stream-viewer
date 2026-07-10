import { createServerFn } from "@tanstack/react-start";

const BASE = "https://bludvplay.online";

export type CardItem = {
  slug: string;
  type: "filmes" | "series";
  title: string;
  year: string;
  poster: string;
};

export type PlayerOption = {
  nume: string;
  post: string;
  type: "movie" | "tv";
  label: string;
};

export type Episode = {
  slug: string;
  number: string;
  title: string;
  date: string;
  thumb: string | null;
  season: string;
};

export type Detail = {
  postId: string;
  title: string;
  year: string;
  poster: string;
  backdrop: string | null;
  description: string;
  playerOptions: PlayerOption[];
  episodes: Episode[];
};

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    },
  });
  if (!res.ok) throw new Error(`Fetch ${url} failed: ${res.status}`);
  return res.text();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#8211;/g, "–")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, "").trim());
}

function parseArchive(html: string): CardItem[] {
  const items: CardItem[] = [];
  const re = /<article class="item[^"]*"[^>]*>([\s\S]*?)<\/article>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const block = m[1];
    const link = /href="(https:\/\/bludvplay\.online\/(filmes|series)\/([^"\/#]+)\/)"/.exec(
      block,
    );
    if (!link) continue;
    const type = link[2] as "filmes" | "series";
    const slug = link[3];
    const poster =
      /data-src="(https:\/\/image\.tmdb\.org\/[^"]+)"/.exec(block)?.[1] ??
      /src="(https:\/\/image\.tmdb\.org\/[^"]+)"/.exec(block)?.[1] ??
      "";
    const title = /<h3 class="title">([^<]+)<\/h3>/.exec(block)?.[1] ?? slug;
    const year = /<span>(\d{4})<\/span>/.exec(block)?.[1] ?? "";
    items.push({ slug, type, title: decodeEntities(title), year, poster });
  }
  return items;
}

export const listArchive = createServerFn({ method: "GET" })
  .inputValidator(
    (d: { type: "filmes" | "series"; page?: number }) => ({
      type: d.type,
      page: Math.max(1, Math.min(200, d.page ?? 1)),
    }),
  )
  .handler(async ({ data }) => {
    const url =
      data.page === 1
        ? `${BASE}/${data.type}/`
        : `${BASE}/${data.type}/page/${data.page}/`;
    try {
      const html = await fetchHtml(url);
      return { items: parseArchive(html), page: data.page };
    } catch (e) {
      console.error("listArchive failed", e);
      return { items: [], page: data.page };
    }
  });

export const listHome = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const [f, s] = await Promise.all([
      fetchHtml(`${BASE}/filmes/`),
      fetchHtml(`${BASE}/series/`),
    ]);
    return { filmes: parseArchive(f), series: parseArchive(s) };
  } catch (e) {
    console.error("listHome failed", e);
    return { filmes: [], series: [] };
  }
});

function parseSearchResults(html: string): CardItem[] {
  const items: CardItem[] = [];
  const re =
    /<div class="result-item">[\s\S]*?<a href="(https:\/\/bludvplay\.online\/(filmes|series)\/([^"\/#]+)\/)">\s*<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[\s\S]*?<span class="year">([^<]*)<\/span>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const type = m[2] as "filmes" | "series";
    const slug = m[3];
    // Upgrade tmdb poster size from w92 to w300 for sharper card
    const poster = m[4].replace("/w92/", "/w300/");
    items.push({
      slug,
      type,
      title: decodeEntities(m[5] || slug),
      year: m[6]?.trim() ?? "",
      poster,
    });
  }
  return items;
}

export const searchContent = createServerFn({ method: "GET" })
  .inputValidator((d: { q: string }) => ({ q: d.q.slice(0, 100) }))
  .handler(async ({ data }) => {
    if (!data.q.trim()) return { items: [], q: data.q };
    try {
      const html = await fetchHtml(
        `${BASE}/?s=${encodeURIComponent(data.q)}`,
      );
      return { items: parseSearchResults(html), q: data.q };
    } catch (e) {
      console.error("searchContent failed", e);
      return { items: [], q: data.q };
    }
  });

function parseDetail(html: string): Detail {
  const postId = /data-post=['"](\d+)['"]/.exec(html)?.[1] ?? "";
  const title =
    /<h1[^>]*>([^<]+)<\/h1>/.exec(html)?.[1]?.trim() ??
    /<meta property="og:title" content="([^"]+)"/.exec(html)?.[1] ??
    "";
  const year =
    /<span class="date">[^<]*?(\d{4})/.exec(html)?.[1] ??
    /\b(19|20)\d{2}\b/.exec(title)?.[0] ??
    "";
  // Poster: prefer w500/w780 tmdb
  const posterMatches = [
    ...html.matchAll(/data-src=['"](https:\/\/image\.tmdb\.org\/t\/p\/w(?:300|500|780)\/[^'"]+)['"]/g),
  ].map((m) => m[1]);
  const poster = posterMatches[0] ?? "";
  const backdropMatch =
    /<meta property="og:image" content="([^"]+)"/.exec(html)?.[1] ?? null;

  // Description
  let description = "";
  const wp = /<div class="wp-content">([\s\S]*?)<\/div>/.exec(html);
  if (wp) description = stripTags(wp[1]);
  if (!description) {
    const og = /<meta property="og:description" content="([^"]+)"/.exec(html);
    if (og) description = decodeEntities(og[1]);
  }

  // Player options
  const playerOptions: PlayerOption[] = [];
  const optRe =
    /<li id='player-option-[^']+' class='dooplay_player_option'([^>]+)>([\s\S]*?)<\/li>/g;
  let om: RegExpExecArray | null;
  while ((om = optRe.exec(html))) {
    const attrs = om[1];
    const inner = om[2];
    const post = /data-post=['"](\d+)['"]/.exec(attrs)?.[1] ?? postId;
    const type = (/data-type=['"](movie|tv)['"]/.exec(attrs)?.[1] ??
      "movie") as "movie" | "tv";
    const nume = /data-nume=['"]([^'"]+)['"]/.exec(attrs)?.[1] ?? "1";
    const label =
      /<span class='title'>([^<]+)<\/span>/.exec(inner)?.[1] ?? `Opção ${nume}`;
    // Skip trailer
    if (nume.toLowerCase() === "trailer") continue;
    playerOptions.push({ post, type, nume, label: decodeEntities(label) });
  }

  // Episodes
  const episodes: Episode[] = [];
  const epRe =
    /<li class='mark-\d+'>([\s\S]*?)<a href='(https:\/\/bludvplay\.online\/episodios\/([^']+)\/)'>([^<]+)<\/a>\s*<span class='date'>([^<]*)<\/span>/g;
  let em: RegExpExecArray | null;
  while ((em = epRe.exec(html))) {
    const block = em[1];
    const slug = em[3];
    const epTitle = em[4];
    const date = em[5];
    const number =
      /<div class='numerando'>([^<]+)<\/div>/.exec(block)?.[1]?.trim() ?? "";
    const thumb =
      /data-src="(https:\/\/image\.tmdb\.org\/[^"]+)"/.exec(block)?.[1] ?? null;
    const season = number.split("-")[0]?.trim() ?? "1";
    episodes.push({
      slug,
      number,
      title: decodeEntities(epTitle),
      date,
      thumb,
      season,
    });
  }

  return {
    postId,
    title: decodeEntities(title),
    year,
    poster,
    backdrop: backdropMatch,
    description,
    playerOptions,
    episodes,
  };
}

export const getDetail = createServerFn({ method: "GET" })
  .inputValidator(
    (d: { type: "filmes" | "series" | "episodios"; slug: string }) => ({
      type: d.type,
      slug: d.slug.replace(/[^a-z0-9\-]/gi, ""),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const html = await fetchHtml(`${BASE}/${data.type}/${data.slug}/`);
      return parseDetail(html);
    } catch (e) {
      console.error("getDetail failed", e);
      throw new Error("Não foi possível carregar este conteúdo.");
    }
  });

export const getEmbed = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { post: string; nume: string; type: "movie" | "tv" }) => d,
  )
  .handler(async ({ data }) => {
    try {
      const body = new URLSearchParams({
        action: "doo_player_ajax",
        post: data.post,
        nume: data.nume,
        type: data.type,
      });
      const res = await fetch(`${BASE}/wp-admin/admin-ajax.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
          Referer: BASE,
        },
        body: body.toString(),
      });
      if (!res.ok) throw new Error(`ajax ${res.status}`);
      const json = (await res.json()) as {
        embed_url?: string;
        type?: string;
      };
      if (!json.embed_url) throw new Error("no embed_url");
      return { embedUrl: json.embed_url };
    } catch (e) {
      console.error("getEmbed failed", e);
      return { embedUrl: "", error: "Não foi possível carregar o player." };
    }
  });