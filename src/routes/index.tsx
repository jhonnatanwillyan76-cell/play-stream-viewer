import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listHome, type CardItem } from "@/lib/bludv.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { PosterCard } from "@/components/PosterCard";

const homeQuery = queryOptions({
  queryKey: ["home"],
  queryFn: () => listHome(),
  staleTime: 5 * 60 * 1000,
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
  const { data } = useSuspenseQuery(homeQuery);
  const featured = data.filmes[0] ?? data.series[0];

  return (
    <div className="min-h-screen">
      <SiteHeader />
      {featured ? <Hero item={featured} /> : null}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10 space-y-14">
        <Row title="Filmes em destaque" items={data.filmes} moreTo="/browse/filmes" />
        <Row title="Séries em destaque" items={data.series} moreTo="/browse/series" />
      </main>
      <Footer />
    </div>
  );
}

function Hero({ item }: { item: CardItem }) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        {item.poster ? (
          <img
            src={item.poster}
            alt=""
            className="h-full w-full object-cover opacity-40 blur-md scale-110"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/40" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24 flex flex-col md:flex-row gap-8 items-end">
        {item.poster ? (
          <img
            src={item.poster.replace("/w780/", "/w500/")}
            alt={item.title}
            className="hidden md:block w-56 rounded-2xl poster-shadow ring-1 ring-border"
          />
        ) : null}
        <div className="flex-1 max-w-2xl">
          <span className="inline-block text-xs font-bold uppercase tracking-[0.25em] text-primary">
            Em alta agora
          </span>
          <h1 className="mt-3 text-4xl sm:text-6xl font-black tracking-tight leading-[1.05]">
            {item.title}
          </h1>
          <p className="mt-4 text-muted-foreground">
            {item.year} · {item.type === "filmes" ? "Filme" : "Série"} · Capa oficial
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              to="/title/$type/$slug"
              params={{ type: item.type, slug: item.slug }}
              className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground font-bold px-6 py-3 hover:brightness-110 transition"
            >
              ▶ Assistir agora
            </Link>
            <Link
              to="/browse/$type"
              params={{ type: item.type }}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 backdrop-blur font-semibold px-6 py-3 hover:bg-secondary transition"
            >
              Ver catálogo
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({ title, items, moreTo }: { title: string; items: CardItem[]; moreTo: string }) {
  return (
    <section>
      <div className="flex items-end justify-between mb-4">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h2>
        <Link to={moreTo} className="text-sm text-primary hover:underline">
          Ver tudo →
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {items.slice(0, 12).map((it) => (
          <PosterCard key={`${it.type}-${it.slug}`} item={it} />
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-border py-8 text-center text-xs text-muted-foreground">
      Conteúdo e player fornecidos por bludvplay.online
    </footer>
  );
}
