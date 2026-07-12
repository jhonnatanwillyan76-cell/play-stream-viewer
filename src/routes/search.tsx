import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { searchContent } from "@/lib/bludv.functions";
import { getLiveStreams } from "@/lib/youtube.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { PosterCard } from "@/components/PosterCard";

const searchSchema = z.object({ q: z.string().catch("").default("") });

const searchQuery = (q: string) =>
  queryOptions({
    queryKey: ["search", q],
    queryFn: () => searchContent({ data: { q } }),
    staleTime: 2 * 60 * 1000,
  });

const liveQuery = () =>
  queryOptions({
    queryKey: ["live-streams"],
    queryFn: () => getLiveStreams(),
    staleTime: 60 * 1000,
  });

export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ q: search.q }),
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.ensureQueryData(searchQuery(deps.q)),
      context.queryClient.ensureQueryData(liveQuery()),
    ]),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.q
          ? `Busca: ${loaderData.q} — Maré TV`
          : "Buscar — Maré TV",
      },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const { data } = useSuspenseQuery(searchQuery(q));
  const { data: liveData } = useSuspenseQuery(liveQuery());
  const navigate = useNavigate();
  const [term, setTerm] = useState(q);
  useEffect(() => setTerm(q), [q]);

  const ql = q.trim().toLowerCase();
  const liveMatches = ql
    ? liveData.streams.filter(
        (s) =>
          s.channel.toLowerCase().includes(ql) ||
          s.handle.toLowerCase().includes(ql) ||
          (s.title ?? "").toLowerCase().includes(ql),
      )
    : [];

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
            {data.items.length + liveMatches.length} resultado(s)
          </p>
        )}

        {liveMatches.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm uppercase tracking-widest text-red-500 font-bold mb-3 flex items-center gap-2">
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              Canais ao vivo
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {liveMatches.map((s) => (
                <a
                  key={s.videoId}
                  href={`/ao-vivo`}
                  className="group text-left rounded-xl overflow-hidden ring-1 ring-border hover:ring-red-500 transition-all"
                >
                  <div className="relative aspect-video bg-black">
                    <img
                      src={`https://i.ytimg.com/vi/${s.videoId}/mqdefault.jpg`}
                      alt={s.channel}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover opacity-90 group-hover:opacity-100 transition"
                    />
                    <span className="absolute top-1.5 left-1.5 text-[10px] font-bold uppercase tracking-wider bg-red-600 text-white px-1.5 py-0.5 rounded flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                      Ao Vivo
                    </span>
                  </div>
                  <div className="p-2 bg-secondary/40">
                    <p className="text-xs font-bold truncate">{s.channel}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {s.title || "Transmissão ao vivo"}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {data.items.length === 0 && liveMatches.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            {q ? "Nada encontrado." : "Use a barra de busca acima."}
          </div>
        ) : data.items.length > 0 ? (
          <section className="mt-8">
            {liveMatches.length > 0 && (
              <h2 className="text-sm uppercase tracking-widest text-primary font-bold mb-3">
                Filmes e Séries
              </h2>
            )}
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