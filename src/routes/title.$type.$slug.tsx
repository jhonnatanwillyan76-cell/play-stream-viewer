import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listM3U, type M3UItem } from "@/lib/m3u.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { GlobalLoadingIndicator } from "@/components/GlobalLoadingIndicator";
import { useState, useRef } from "react";
import { VideoPlayer } from "@/components/VideoPlayer";

const titleQuery = (slug: string) =>
  queryOptions({
    queryKey: ["title", slug],
    queryFn: async () => {
      const all = await listM3U();
      const item =
        all.find((it: M3UItem) => it.slug === slug) ??
        all.find((it: M3UItem) => it.slug.startsWith(slug) || slug.startsWith(it.slug)) ??
        null;
      return item;
    },
    staleTime: 60 * 60 * 1000,
  });

export const Route = createFileRoute("/title/$type/$slug")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(titleQuery(params.slug)),
  component: TitlePage,
  pendingComponent: () => <GlobalLoadingIndicator />,
});

function TitlePage() {
  const { slug, type } = Route.useParams();
  const { data: item } = useSuspenseQuery(titleQuery(slug));
  const [selectedEpisode, setSelectedEpisode] = useState<{ name: string; url: string } | null>(
    item && item.type === "movie" ? { name: item.name, url: item.url } : null
  );
  const playerRef = useRef<HTMLDivElement>(null);

  if (!item) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-24 text-center space-y-6">
          <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h1 className="text-4xl font-black title-cinematic tracking-tighter">Título não encontrado</h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed">
            O conteúdo que você procura não está disponível na lista atual ou o link expirou. Tente buscar novamente na página inicial.
          </p>
          <div className="pt-6">
            <Link
              to="/"
              className="px-10 py-4 bg-primary text-primary-foreground rounded-full font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
            >
              Voltar ao Início
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const handleFullScreen = () => {
    if (playerRef.current) {
      if (playerRef.current.requestFullscreen) {
        playerRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Info Section */}
          <div className="lg:col-span-1 space-y-6">
            <div className="aspect-[2/3] overflow-hidden rounded-2xl bg-secondary ring-1 ring-border shadow-2xl">
              {item.logo ? (
                <img src={item.logo} alt={item.name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center p-8 text-center font-bold text-xl uppercase tracking-widest text-muted-foreground">
                  {item.name}
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
                {type === 'movie' ? 'Filme' : 'Série'}
              </span>
              <h1 className="text-4xl font-black title-cinematic leading-tight">
                {item.name}
              </h1>
              <p className="text-muted-foreground text-sm uppercase tracking-widest">
                {item.group || "Catálogo Maré TV"}
              </p>
            </div>
          </div>

          {/* Player / Selector Section */}
          <div className="lg:col-span-2 space-y-8">
            {selectedEpisode ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">Assistindo: <span className="text-primary">{selectedEpisode.name}</span></h2>
                  <button 
                    onClick={handleFullScreen}
                    className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-xs font-bold transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
                    TELA CHEIA
                  </button>
                </div>
                
                <div ref={playerRef} className="w-full">
                  <VideoPlayer 
                    src={selectedEpisode.url}
                    poster={item.logo}
                    branding="MARÉ TV"
                    onFullScreen={handleFullScreen}
                  />
                </div>
              </div>
            ) : (
              <div className="aspect-video flex flex-col items-center justify-center rounded-2xl bg-secondary/50 border-2 border-dashed border-border text-center p-8">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                   <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
                <h3 className="text-xl font-bold">Selecione um episódio</h3>
                <p className="text-muted-foreground mt-2 max-w-xs">Escolha abaixo qual episódio você deseja assistir agora.</p>
              </div>
            )}

            {item.type === 'series' && item.episodes && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold tracking-tight">Episódios</h2>
                  <span className="px-2 py-0.5 rounded bg-secondary text-[10px] font-bold text-muted-foreground">
                    {item.episodes.length} DISPONÍVEIS
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {item.episodes.map((ep: { name: string; url: string }, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedEpisode(ep);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                        selectedEpisode?.url === ep.url 
                          ? 'bg-primary/10 border-primary ring-1 ring-primary text-primary shadow-lg shadow-primary/5' 
                          : 'bg-secondary/30 border-border hover:border-primary/50 hover:bg-secondary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          selectedEpisode?.url === ep.url ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="text-sm font-bold line-clamp-1">{ep.name}</span>
                      </div>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="mt-20 py-10 text-center border-t border-border">
        <p className="text-sm text-muted-foreground">Maré TV · Assista em qualquer lugar</p>
      </footer>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
      `}</style>
    </div>
  );
}