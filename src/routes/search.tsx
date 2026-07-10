import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
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
        title: loaderData?.q
          ? `Busca: ${loaderData.q} — BLUDVflix`
          : "Buscar — BLUDVflix",
      },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const { data } = useSuspenseQuery(searchQuery(q));

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
        <p className="text-sm text-muted-foreground mt-2">
          {data.items.length} resultado(s)
        </p>

        {data.items.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            {q ? "Nada encontrado." : "Use a barra de busca acima."}
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {data.items.map((it) => (
              <PosterCard key={`${it.type}-${it.slug}`} item={it} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}