import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { listM3U, type M3UItem } from "@/lib/m3u.functions";
import { SiteHeader } from "@/components/SiteHeader";

const searchSchema = z.object({ q: z.string().catch("").default("") });

const searchQuery = (q: string) =>
  queryOptions({
    queryKey: ["search-m3u", q],
    queryFn: async () => {
      const items = await listM3U();
      if (!q) return [];
      const lower = q.toLowerCase();
      return items.filter(it => 
        it.name.toLowerCase().includes(lower) || 
        it.group?.toLowerCase().includes(lower)
      );
    },
    staleTime: 5 * 60 * 1000,
  });

export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ q: search.q }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(searchQuery(deps.q)),
  head: ({ search }) => ({
    meta: [
      {
        title: search.q
          ? `Busca: ${search.q} — Maré TV`
          : "Buscar — Maré TV",
      },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const { data: items } = useSuspenseQuery(searchQuery(q));
  
  const navigate = useNavigate();
  const [term, setTerm] = useState(q);
  useEffect(() => setTerm(q), [q]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        <p className="text-xs uppercase tracking-[0.25em] text-primary font-bold">
          Busca Digital
        </p>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight mt-1">
          {q ? `Resultados na lista para "${q}"` : "Digite algo para buscar na M3U"}
        </h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const t = term.trim();
            navigate({ to: "/search", search: { q: t } });
          }}
          className="mt-6 flex gap-2 max-w-2xl"
        >
          <input
            type="search"
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar na lista M3U…"
            className="flex-1 rounded-full bg-secondary/70 border border-border px-5 py-3 text-base outline-none focus:ring-2 focus:ring-primary/60"
          />
          <button
            type="submit"
            className="rounded-full bg-primary text-primary-foreground font-bold px-6 py-3 text-sm uppercase tracking-wider hover:opacity-90 transition"
          >
            Buscar
          </button>
        </form>
        {q && (
          <p className="text-sm text-muted-foreground mt-4">
            {items.length} resultado(s) encontrados na lista
          </p>
        )}

        {items.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            {q ? "Nenhum conteúdo correspondente encontrado na lista M3U." : "Use a barra de busca acima."}
          </div>
        ) : (
          <section className="mt-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {items.map((it, idx) => (
                <M3UCard key={idx} item={it} />
              ))}
            </div>
          </section>
        )}
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
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="w-full py-2 bg-primary text-primary-foreground text-center rounded-lg font-bold text-xs uppercase tracking-wider hover:scale-105 transition-transform">
          ▶ Assistir
        </a>
      </div>
    </div>
  );
}
