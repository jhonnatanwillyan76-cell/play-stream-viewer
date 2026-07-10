import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/ao-vivo")({
  head: () => ({
    meta: [
      { title: "TV Ao Vivo — BLUDVflix" },
      {
        name: "description",
        content: "Transmissão ao vivo da TV Globo via Globoplay.",
      },
    ],
  }),
  component: LivePage,
});

function LivePage() {
  const src = "https://globoplay.globo.com/tv-globo/ao-vivo/6120663/";
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-primary font-bold">
            Ao Vivo
          </p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mt-1">
            TV Globo
          </h1>
          <p className="text-muted-foreground mt-2 text-sm max-w-2xl">
            Sinal aberto da TV Globo pelo Globoplay. Pode exigir login gratuito
            na Globo e estar disponível apenas em território brasileiro.
          </p>
        </div>

        <div className="relative w-full aspect-video overflow-hidden rounded-2xl bg-black ring-1 ring-border poster-shadow">
          <iframe
            src={src}
            title="TV Globo ao vivo"
            className="absolute inset-0 h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        <div className="rounded-xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
          Se o player não carregar acima, o Globoplay está bloqueando a
          incorporação. Abra o sinal direto no site oficial:{" "}
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline"
          >
            assistir no Globoplay
          </a>
          .
        </div>
      </main>
    </div>
  );
}