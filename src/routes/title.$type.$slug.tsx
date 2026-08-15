import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listM3U, type M3UItem } from "@/lib/m3u.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { useState, useRef, useEffect } from "react";

const titleQuery = (slug: string) =>
  queryOptions({
    queryKey: ["title", slug],
    queryFn: async () => {
      const all = await listM3U();
      const item = all.find((it) => it.slug === slug);
      if (!item) throw new Error("Conteúdo não encontrado");
      return item;
    },
    staleTime: 60 * 60 * 1000,
  });

export const Route = createFileRoute("/title/$type/$slug")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(titleQuery(params.slug)),
  component: TitlePage,
});

function TitlePage() {
  const { slug, type } = Route.useParams();
  const { data: item } = useSuspenseQuery(titleQuery(slug));
  const [selectedEpisode, setSelectedEpisode] = useState<{ name: string; url: string } | null>(
    item.type === "movie" ? { name: item.name, url: item.url } : null
  );
  const playerRef = useRef<HTMLDivElement>(null);

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
                
                <div 
                  ref={playerRef}
                  className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black ring-1 ring-border shadow-2xl group"
                >
                  <video 
                    src={selectedEpisode.url}
                    controls
                    className="w-full h-full"
                    poster={item.logo}
                  >
                    Seu navegador não suporta o player de vídeo.
                  </video>
                  
                  {/* Overlay for branding/protection if needed */}
                  <div className="absolute top-4 right-4 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
                    <span className="text-primary font-black title-cinematic text-xl italic tracking-tighter">MARÉ TV</span>
                  </div>
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
                  {item.episodes.map((ep, idx) => (
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