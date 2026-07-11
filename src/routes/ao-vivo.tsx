import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { getLiveStreams } from "@/lib/youtube.functions";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/ao-vivo")({
  head: () => ({
    meta: [
      { title: "Ao Vivo — Maré TV" },
      {
        name: "description",
        content: "Transmissões ao vivo em tempo real.",
      },
    ],
  }),
  component: LivePage,
});

function LivePage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["live-streams"],
    queryFn: () => getLiveStreams(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const streams = data?.streams ?? [];
  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => {
    if (streams.length === 0) {
      setActiveId(null);
      return;
    }
    if (!activeId || !streams.find((s) => s.videoId === activeId)) {
      setActiveId(streams[0].videoId);
    }
  }, [streams, activeId]);
  const active = streams.find((s) => s.videoId === activeId) ?? streams[0];
  const playerWrapRef = useRef<HTMLDivElement>(null);
  const requestFs = () => {
    const el = playerWrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen?.();
    }
  };
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-8">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-primary font-bold flex items-center gap-2">
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              Ao Vivo Agora {streams.length > 0 && `· ${streams.length}`}
            </p>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight mt-1">
              Transmissões ativas
            </h1>
          </div>
          <button
            onClick={() => refetch()}
            className="text-xs uppercase tracking-wider px-3 py-2 rounded-md bg-secondary hover:bg-secondary/70 transition-colors"
          >
            {isFetching ? "Atualizando…" : "Atualizar"}
          </button>
        </div>

        {isLoading ? (
          <div className="text-muted-foreground text-sm">Verificando transmissões…</div>
        ) : streams.length === 0 ? (
          <div className="rounded-2xl border border-border bg-secondary/30 p-10 text-center">
            <div className="text-5xl mb-3">📴</div>
            <p className="font-bold text-lg">Nenhuma transmissão ao vivo no momento</p>
            <p className="text-muted-foreground text-sm mt-2">
              Esta página atualiza automaticamente a cada minuto. Volte mais tarde.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {active && (
              <div className="space-y-3">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-widest text-red-500 font-bold">
                    ● {active.channel}
                  </p>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
                    {active.title || "Transmissão ao vivo"}
                  </h2>
                </div>
                <div
                  ref={playerWrapRef}
                  className="group relative w-full aspect-video overflow-hidden rounded-2xl bg-black ring-1 ring-border poster-shadow"
                >
                  <iframe
                    key={active.videoId}
                    src={`https://www.youtube.com/embed/${active.videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&fs=0&disablekb=1&controls=0`}
                    title={active.title || active.channel}
                    className="absolute inset-0 h-full w-full"
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                  {/* Bloqueia todos os cliques/redirecionamentos do YouTube */}
                  <div
                    className="absolute inset-0"
                    style={{ pointerEvents: "auto" }}
                    onClick={(e) => e.preventDefault()}
                  />
                  {/* Botão de tela cheia próprio */}
                  <button
                    type="button"
                    onClick={requestFs}
                    aria-label="Tela cheia"
                    className="absolute bottom-3 right-3 z-10 rounded-md bg-black/60 hover:bg-black/80 text-white p-2 backdrop-blur transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
            <div>
              <h3 className="text-sm uppercase tracking-widest text-muted-foreground font-bold mb-3">
                Outros canais ao vivo
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {streams.map((s) => {
                  const isActive = s.videoId === active?.videoId;
                  return (
                    <button
                      key={s.videoId}
                      onClick={() => setActiveId(s.videoId)}
                      className={`group text-left rounded-xl overflow-hidden ring-1 transition-all ${
                        isActive
                          ? "ring-red-500 shadow-lg shadow-red-500/20"
                          : "ring-border hover:ring-primary/60"
                      }`}
                    >
                      <div className="relative aspect-video bg-black">
                        <img
                          src={`https://i.ytimg.com/vi/${s.videoId}/mqdefault.jpg`}
                          alt={s.channel}
                          loading="lazy"
                          className="absolute inset-0 h-full w-full object-cover opacity-90 group-hover:opacity-100 transition"
                        />
                        <span className="absolute top-1.5 left-1.5 text-[10px] font-bold uppercase tracking-wider bg-red-600 text-white px-1.5 py-0.5 rounded flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                          Ao Vivo
                        </span>
                      </div>
                      <div className="p-2 bg-secondary/40">
                        <p className="text-xs font-bold truncate">{s.channel}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {s.title || "Transmissão ao vivo"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}