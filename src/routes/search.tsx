import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { searchContent } from "@/lib/bludv.functions";

import { SiteHeader } from "@/components/SiteHeader";
import { PosterCard } from "@/components/PosterCard";

const searchSchema = z.object({ q: z.string().catch("").default("") });

const searchQuery = (q: string) =>
  queryOptions({
    queryKey: ["search", q],
    queryFn: () => searchContent({ data: { q } }),
    staleTime: 2 * 60 * 1000,
  });


export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ q: search.q }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(searchQuery(deps.q)),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.[0]?.q
          ? `Busca: ${loaderData[0].q} — Maré TV`
          : "Buscar — Maré TV",
      },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const { data } = useSuspenseQuery(searchQuery(q));
  
  const navigate = useNavigate();
  const [term, setTerm] = useState(q);
  useEffect(() => setTerm(q), [q]);


  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        <p className="text-xs uppercase tracking-[0.25em] text-primary font-bold">
          Busca
        </p>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight mt-1">
          {q ? `Resultados para "${q}"` : "Digite algo para buscar"}
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
            placeholder="Buscar filmes ou séries…"
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
            {data.items.length} resultado(s)
          </p>
        )}

        {data.items.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            {q ? "Nada encontrado." : "Use a barra de busca acima."}
          </div>
        ) : (
          <section className="mt-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {data.items.map((it) => (
                <PosterCard key={`${it.type}-${it.slug}`} item={it} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}