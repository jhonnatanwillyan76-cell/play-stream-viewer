import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getEmbed, type PlayerOption } from "@/lib/bludv.functions";

export function Player({ options }: { options: PlayerOption[] }) {
  const call = useServerFn(getEmbed);
  const [selected, setSelected] = useState(0);
  const [embedUrl, setEmbedUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const opt = options[selected];

  useEffect(() => {
    if (!opt) return;
    let alive = true;
    setLoading(true);
    setError(null);
    setEmbedUrl("");
    call({ data: { post: opt.post, nume: opt.nume, type: opt.type } })
      .then((res) => {
        if (!alive) return;
        if (!res.embedUrl) {
          setError(res.error ?? "Player indisponível.");
        } else {
          setEmbedUrl(res.embedUrl);
        }
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Erro ao carregar player.");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [opt, call]);

  async function goFullscreen() {
    const el = wrapRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (!opt) {
    return (
      <div className="aspect-video grid place-items-center bg-secondary rounded-2xl text-muted-foreground">
        Nenhuma opção de player disponível.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        ref={wrapRef}
        className="relative aspect-video overflow-hidden rounded-2xl bg-black ring-1 ring-border poster-shadow"
      >
        {loading && (
          <div className="absolute inset-0 grid place-items-center text-muted-foreground">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Carregando player…</p>
            </div>
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 grid place-items-center px-6 text-center">
            <p className="text-destructive">{error}</p>
          </div>
        )}
        {embedUrl && !loading && (
          <iframe
            key={embedUrl}
            src={embedUrl}
            title="Player"
            className="absolute inset-0 h-full w-full border-0"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
            referrerPolicy="no-referrer"
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {options.map((o, i) => (
            <button
              key={`${o.post}-${o.nume}`}
              onClick={() => setSelected(i)}
              className={
                "px-4 py-2 rounded-full text-sm font-semibold border transition " +
                (i === selected
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary text-foreground border-border hover:bg-secondary/70")
              }
            >
              {o.label}
            </button>
          ))}
        </div>
        <button
          onClick={goFullscreen}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border font-semibold text-sm hover:bg-secondary/70"
          title="Tela cheia"
        >
          ⛶ Tela cheia
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        O player é fornecido por um serviço externo; os controles internos dele
        (qualidade, volume, tela cheia) permanecem inalterados por segurança do
        navegador.
      </p>
    </div>
  );
}