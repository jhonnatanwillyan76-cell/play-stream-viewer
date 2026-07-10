import { createServerFn } from "@tanstack/react-start";

export type LiveStream = {
  handle: string;
  videoId: string;
  title: string;
  channel: string;
};

const HANDLES = ["CazeTV", "sbt"];

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
    // Reliable live marker: ytInitialPlayerResponse contains "isLive":true and hlsManifestUrl.
    const playerBlock =
      /ytInitialPlayerResponse\s*=\s*(\{[\s\S]*?\});\s*(?:var|<\/script>)/.exec(
        html,
      )?.[1] ?? "";
    if (!playerBlock) return null;
    const isLive = /"isLive"\s*:\s*true/.test(playerBlock);
    const hasHls = /"hlsManifestUrl"\s*:\s*"/.test(playerBlock);
    if (!isLive || !hasHls) return null;
    const videoId = /"videoId"\s*:\s*"([^"]+)"/.exec(playerBlock)?.[1];
    if (!videoId) return null;
    const title =
      /"title"\s*:\s*\{\s*"simpleText"\s*:\s*"([^"]+)"/.exec(playerBlock)?.[1] ??
      /"videoDetails"[\s\S]{0,500}?"title"\s*:\s*"([^"]+)"/.exec(playerBlock)?.[1] ??
      "";
    const channel =
      /"author"\s*:\s*"([^"]+)"/.exec(playerBlock)?.[1] ?? handle;
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