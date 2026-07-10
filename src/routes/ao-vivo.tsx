import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { getLiveStreams } from "@/lib/youtube.functions";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/ao-vivo")({
  head: () => ({
    meta: [
      { title: "Ao Vivo — BLUDVflix" },
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
              Ao Vivo Agora
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
          <div className="grid gap-8">
            {streams.map((s) => (
              <div key={s.videoId} className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-widest text-red-500 font-bold">
                      ● {s.channel}
                    </p>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
                      {s.title || "Transmissão ao vivo"}
                    </h2>
                  </div>
                </div>
                <div className="relative w-full aspect-video overflow-hidden rounded-2xl bg-black ring-1 ring-border poster-shadow">
                  <iframe
                    src={`https://www.youtube.com/embed/${s.videoId}?autoplay=1&rel=0&modestbranding=1`}
                    title={s.title || s.channel}
                    className="absolute inset-0 h-full w-full"
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}