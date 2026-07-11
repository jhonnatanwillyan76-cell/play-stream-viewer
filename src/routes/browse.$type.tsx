import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import { listArchive } from "@/lib/bludv.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { PosterCard } from "@/components/PosterCard";

const searchSchema = z.object({ page: z.number().int().min(1).max(200).catch(1) });

const archiveQuery = (type: "filmes" | "series", page: number) =>
  queryOptions({
    queryKey: ["archive", type, page],
    queryFn: () => listArchive({ data: { type, page } }),
    staleTime: 5 * 60 * 1000,
  });

export const Route = createFileRoute("/browse/$type")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: ({ context, params, deps }) => {
    if (params.type !== "filmes" && params.type !== "series") throw notFound();
    return context.queryClient.ensureQueryData(
      archiveQuery(params.type as "filmes" | "series", deps.page),
    );
  },
  head: ({ params }) => ({
    meta: [
      {
        title:
          (params.type === "filmes" ? "Filmes" : "Séries") + " — Maré TV",
      },
    ],
  }),
  component: BrowsePage,
});

function BrowsePage() {
  const { type } = Route.useParams();
  const { page } = Route.useSearch();
  const t = type as "filmes" | "series";
  const { data } = useSuspenseQuery(archiveQuery(t, page));

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-primary font-bold">
              Catálogo
            </p>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight mt-1">
              {t === "filmes" ? "Filmes" : "Séries"}
            </h1>
          </div>
          <span className="text-sm text-muted-foreground">Página {page}</span>
        </div>

        {data.items.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            Nada encontrado.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {data.items.map((it) => (
              <PosterCard key={`${it.type}-${it.slug}`} item={it} />
            ))}
          </div>
        )}

        <div className="mt-10 flex justify-center gap-3">
          {page > 1 ? (
            <Link
              to="/browse/$type"
              params={{ type }}
              search={{ page: page - 1 }}
              className="px-5 py-2 rounded-full border border-border bg-secondary hover:bg-secondary/70"
            >
              ← Anterior
            </Link>
          ) : null}
          {data.items.length > 0 ? (
            <Link
              to="/browse/$type"
              params={{ type }}
              search={{ page: page + 1 }}
              className="px-5 py-2 rounded-full bg-primary text-primary-foreground font-semibold hover:brightness-110"
            >
              Próxima →
            </Link>
          ) : null}
        </div>
      </main>
    </div>
  );
}