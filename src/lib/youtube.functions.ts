import { createServerFn } from "@tanstack/react-start";

export type LiveStream = {
  handle: string;
  videoId: string;
  title: string;
  channel: string;
};

const HANDLES = [
  "CazeTV",
  "sbt",
  "PicaPau",
  "PetVetLove",
  "BoomerangUK",
  "tvaparecida",
  "REDEBRASILLIVE",
  "euronewspt",
  "rtvenoticias",
  "recordnews",
];

async function checkLive(handle: string): Promise<LiveStream | null> {
  try {
    const res = await fetch(`https://www.youtube.com/@${handle}/live`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    // /@handle/live redirects to the channel page when nothing is live,
    // so the presence of "isLive":true is the reliable signal. hlsManifestUrl
    // is only injected client-side, so we don't require it.
    if (!/"isLive"\s*:\s*true/.test(html)) return null;
    const videoId =
      /"videoDetails"\s*:\s*\{\s*"videoId"\s*:\s*"([^"]+)"/.exec(html)?.[1] ??
      /<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([^"]+)"/.exec(
        html,
      )?.[1];
    if (!videoId) return null;
    const title =
      /"videoDetails"[\s\S]{0,2000}?"title"\s*:\s*"([^"]+)"/.exec(html)?.[1] ??
      /<meta name="title" content="([^"]+)"/.exec(html)?.[1] ??
      "";
    const channel =
      /"author"\s*:\s*"([^"]+)"/.exec(html)?.[1] ?? handle;
    return {
      handle,
      videoId,
      title: title.replace(/\\u0026/g, "&"),
      channel,
    };
  } catch (e) {
    console.error(`checkLive(${handle}) failed`, e);
    return null;
  }
}

export const getLiveStreams = createServerFn({ method: "GET" }).handler(
  async () => {
    const results = await Promise.all(HANDLES.map(checkLive));
    return { streams: results.filter((r): r is LiveStream => r !== null) };
  },
);