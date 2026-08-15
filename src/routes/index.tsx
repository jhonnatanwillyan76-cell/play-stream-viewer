import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listM3U, type M3UItem } from "@/lib/m3u.functions";
import { SiteHeader } from "@/components/SiteHeader";

const homeQuery = queryOptions({
  queryKey: ["home"],
  queryFn: async () => {
    const m3u = await listM3U();
    const filmes = m3u.filter(i => i.type === 'movie');
    const series = m3u.filter(i => i.type === 'series');
    return { filmes, series, m3u };
  },
  staleTime: 30 * 1000, // Reduced staleTime to help with limit issues
  gcTime: 60 * 1000,
});

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(homeQuery),
  component: Home,
  pendingComponent: () => (
    <div className="min-h-screen grid place-items-center text-muted-foreground">
      Carregando catálogo…
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen grid place-items-center text-center px-6">
      <div>
        <h1 className="text-2xl font-bold">Erro ao carregar</h1>
        <p className="text-muted-foreground mt-2">{error.message}</p>
      </div>
    </div>
  ),
});

function Home() {
  const { data, error } = useSuspenseQuery(homeQuery);
  const featured = data?.m3u?.[0];

  if (!data || data.m3u.length === 0) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-7xl px-4 py-20 text-center space-y-4">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h1 className="text-3xl font-black title-cinematic">Catálogo Indisponível</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            A lista M3U não pôde ser carregada ou está vazia no momento. Isso pode ser devido ao limite de conexões simultâneas do provedor.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold hover:scale-105 transition-transform"
          >
            Tentar Novamente
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      {featured ? <M3UHero item={featured} /> : null}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10 space-y-14">
        {data.filmes.length > 0 && <M3URow title="Filmes da Lista" items={data.filmes} />}
        {data.series.length > 0 && <M3URow title="Séries da Lista" items={data.series} />}
      </main>
      <Footer />
    </div>
  );
}

function M3UHero({ item }: { item: M3UItem }) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        {item.logo ? (
          <img
            src={item.logo}
            alt=""
            className="h-full w-full object-cover opacity-40 blur-md scale-110"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/40" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24 flex flex-col md:flex-row gap-8 items-end">
        {item.logo ? (
          <img
            src={item.logo}
            alt={item.name}
            className="hidden md:block w-56 rounded-2xl poster-shadow ring-1 ring-border"
          />
        ) : (
          <div className="hidden md:flex w-56 aspect-[2/3] rounded-2xl bg-secondary ring-1 ring-border items-center justify-center p-4 text-center font-bold text-xs uppercase tracking-widest text-muted-foreground">
             {item.name}
          </div>
        )}
        <div className="flex-1 max-w-2xl">
          <span className="inline-block text-xs font-bold uppercase tracking-[0.25em] text-primary">
            Em destaque na Maré TV
          </span>
          <h1 className="mt-3 text-4xl sm:text-6xl font-black tracking-tight leading-[1.05] title-cinematic">
            {item.name}
          </h1>
          <p className="mt-4 text-muted-foreground">
            {item.group || "Conteúdo Digital"} · {item.type === "movie" ? "Filme" : "Série"}
          </p>
          <div className="mt-6 flex gap-3">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground font-bold px-8 py-3 hover:brightness-110 transition scale-105 active:scale-95"
            >
              ▶ Assistir agora
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function M3URow({ title, items }: { title: string; items: M3UItem[] }) {
  return (
    <section>
      <div className="flex items-end justify-between mb-4">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {items.slice(0, 48).map((it, idx) => (
          <div key={idx} className="group relative aspect-[2/3] overflow-hidden rounded-xl bg-secondary ring-1 ring-border transition-all hover:ring-primary/60">
            {it.logo ? (
              <img src={it.logo} alt={it.name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-secondary to-background">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">M3U CONTENT</span>
                <span className="text-xs font-bold leading-tight line-clamp-3">{it.name}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
              <p className="text-[10px] text-white/70 mb-2 line-clamp-2 font-medium">{it.name}</p>
              <a href={it.url} target="_blank" rel="noopener noreferrer" className="w-full py-2 bg-primary text-primary-foreground text-center rounded-lg font-bold text-xs uppercase tracking-wider hover:scale-105 transition-transform">
                ▶ Assistir
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-border py-8 text-center text-xs text-muted-foreground">
      Maré TV · Conteúdo M3U e Catálogo Digital
    </footer>
  );
}
