import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getDetail } from "@/lib/bludv.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { Player } from "@/components/Player";

const detailQuery = (type: "filmes" | "series" | "episodios", slug: string) =>
  queryOptions({
    queryKey: ["detail", type, slug],
    queryFn: () => getDetail({ data: { type, slug } }),
    staleTime: 5 * 60 * 1000,
  });

export const Route = createFileRoute("/title/$type/$slug")({
  loader: ({ context, params }) => {
    if (!["filmes", "series", "episodios"].includes(params.type)) throw notFound();
    return context.queryClient.ensureQueryData(
      detailQuery(params.type as "filmes" | "series" | "episodios", params.slug),
    );
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.title} — Maré TV` },
          { name: "description", content: loaderData.description.slice(0, 160) },
          { property: "og:title", content: loaderData.title },
          { property: "og:image", content: loaderData.backdrop ?? loaderData.poster },
        ]
      : [{ title: "Carregando… — Maré TV" }],
  }),
  component: TitlePage,
  pendingComponent: () => (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-16 text-muted-foreground">Carregando…</div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Ops</h1>
        <p className="text-muted-foreground mt-2">{error.message}</p>
        <Link to="/" className="text-primary mt-4 inline-block">← Voltar ao início</Link>
      </div>
    </div>
  ),
});

function TitlePage() {
  const { type, slug } = Route.useParams();
  const t = type as "filmes" | "series" | "episodios";
  const { data } = useSuspenseQuery(detailQuery(t, slug));

  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Backdrop hero */}
      <div className="relative">
        <div className="absolute inset-0 -z-0">
          {data.poster ? (
            <img
              src={data.poster}
              alt=""
              className="h-full w-full object-cover opacity-30 blur-2xl scale-110"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/90 to-background" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-8 pb-10 grid md:grid-cols-[240px_1fr] gap-8">
          {data.poster ? (
            <img
              src={data.poster.replace("/w780/", "/w500/")}
              alt={data.title}
              className="w-40 md:w-full rounded-2xl poster-shadow ring-1 ring-border"
            />
          ) : null}
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-primary font-bold">
              {t === "filmes" ? "Filme" : t === "series" ? "Série" : "Episódio"}
            </p>
            <h1 className="title-cinematic text-4xl sm:text-6xl mt-3">
              {data.title}
            </h1>
            {data.year ? (
              <p className="text-muted-foreground mt-1">{data.year}</p>
            ) : null}
            {data.description ? (
              <p className="mt-4 text-foreground/85 leading-relaxed max-w-2xl">
                {data.description}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pb-16 space-y-10">
        {data.playerOptions.length > 0 ? (
          <section>
            <h2 className="text-xl font-bold mb-4">Assistir</h2>
            <Player options={data.playerOptions} />
          </section>
        ) : (
          <div className="rounded-2xl border border-border bg-secondary/50 p-6 text-muted-foreground">
            Nenhum player disponível neste momento.
          </div>
        )}

        {data.episodes.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4">Episódios</h2>
            <EpisodeList episodes={data.episodes} />
          </section>
        )}
      </main>
    </div>
  );
}

function EpisodeList({
  episodes,
}: {
  episodes: import("@/lib/bludv.functions").Episode[];
}) {
  const bySeason = new Map<string, typeof episodes>();
  episodes.forEach((ep) => {
    const key = ep.season || "1";
    if (!bySeason.has(key)) bySeason.set(key, [] as unknown as typeof episodes);
    (bySeason.get(key) as unknown as (typeof episodes)[number][]).push(ep);
  });
  const seasons = Array.from(bySeason.entries()).sort(
    (a, b) => Number(a[0]) - Number(b[0]),
  );

  return (
    <div className="space-y-8">
      {seasons.map(([season, eps]) => (
        <div key={season}>
          <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-3">
            Temporada {season}
          </h3>
          <div className="grid gap-2">
            {eps.map((ep) => (
              <Link
                key={ep.slug}
                to="/title/$type/$slug"
                params={{ type: "episodios", slug: ep.slug }}
                className="flex items-center gap-4 p-3 rounded-xl bg-secondary/60 hover:bg-secondary border border-border transition"
              >
                <div className="w-24 sm:w-32 aspect-video rounded-lg overflow-hidden bg-background shrink-0">
                  {ep.thumb ? (
                    <img src={ep.thumb} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{ep.number}</p>
                  <p className="font-semibold truncate">{ep.title}</p>
                  <p className="text-xs text-muted-foreground">{ep.date}</p>
                </div>
                <span className="text-primary font-bold pr-2">▶</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}