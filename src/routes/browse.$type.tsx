import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import { listM3U, type M3UItem } from "@/lib/m3u.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { GlobalLoadingIndicator } from "@/components/GlobalLoadingIndicator";

const searchSchema = z.object({ page: z.number().int().min(1).max(200).catch(1) });

const archiveQuery = (type: "movie" | "series", page: number) =>
  queryOptions({
    queryKey: ["archive-m3u", type, page],
    queryFn: async () => {
      const all = await listM3U();
      const filtered = all.filter((it: M3UItem) => it.type === type);
      const pageSize = 24;
      const start = (page - 1) * pageSize;
      return {
        items: filtered.slice(start, start + pageSize),
        hasMore: filtered.length > start + pageSize
      };
    },
    staleTime: 5 * 60 * 1000,
  });

export const Route = createFileRoute("/browse/$type")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: ({ context, params, deps }) => {
    const type = params.type === "filmes" ? "movie" : params.type === "series" ? "series" : null;
    if (!type) throw notFound();
    return context.queryClient.ensureQueryData(
      archiveQuery(type as "movie" | "series", deps.page),
    );
  },
  pendingComponent: () => <GlobalLoadingIndicator />,
  head: () => ({
    meta: [
      {
        title: "Catálogo M3U — Maré TV",
      },
    ],
  }),
  component: BrowsePage,
});

function BrowsePage() {
  const { type } = Route.useParams();
  const { page } = Route.useSearch();
  const t = type === "filmes" ? "movie" : "series";
  const { data } = useSuspenseQuery(archiveQuery(t as "movie" | "series", page));

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-primary font-bold">
              Catálogo Digital
            </p>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight mt-1">
              {type === "filmes" ? "Filmes" : "Séries"}
            </h1>
          </div>
          <span className="text-sm text-muted-foreground">Página {page}</span>
        </div>

        {data.items.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            Nenhum conteúdo nesta categoria.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {data.items.map((it: M3UItem, idx: number) => (
              <M3UCard key={idx} item={it} />
            ))}
          </div>
        )}

        <div className="mt-10 flex justify-center gap-3">
          {page > 1 ? (
            <Link
              to="/browse/$type"
              params={{ type }}
              search={{ page: page - 1 }}
              className="px-5 py-2 rounded-full border border-border bg-secondary hover:bg-secondary/70 transition"
            >
              ← Anterior
            </Link>
          ) : null}
          {data.hasMore ? (
            <Link
              to="/browse/$type"
              params={{ type }}
              search={{ page: page + 1 }}
              className="px-5 py-2 rounded-full bg-primary text-primary-foreground font-semibold hover:brightness-110 transition"
            >
              Próxima →
            </Link>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function M3UCard({ item }: { item: M3UItem }) {
  return (
    <div className="group relative aspect-[2/3] overflow-hidden rounded-xl bg-secondary ring-1 ring-border transition-all hover:ring-primary/60">
      {item.logo ? (
        <img src={item.logo} alt={item.name} className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-secondary to-background">
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">M3U</span>
          <span className="text-xs font-bold leading-tight line-clamp-3">{item.name}</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
        <p className="text-[10px] text-white/70 mb-2 line-clamp-2 font-medium">{item.name}</p>
        <Link 
          to="/title/$type/$slug"
          params={{ type: item.type === 'movie' ? 'movie' : 'series', slug: item.slug }}
          className="w-full py-2 bg-primary text-primary-foreground text-center rounded-lg font-bold text-xs uppercase tracking-wider hover:scale-105 transition-transform"
        >
          ▶ {item.type === 'movie' ? 'Assistir' : 'Ver Episódios'}
        </Link>
      </div>
    </div>
  );
}
