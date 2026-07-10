import { Link } from "@tanstack/react-router";
import type { CardItem } from "@/lib/bludv.functions";

export function PosterCard({ item }: { item: CardItem }) {
  return (
    <Link
      to="/title/$type/$slug"
      params={{ type: item.type, slug: item.slug }}
      className="group block card-hover hover:-translate-y-1"
    >
      <div className="relative aspect-video overflow-hidden rounded-xl bg-secondary poster-shadow ring-1 ring-border">
        {item.poster ? (
          <img
            src={item.poster}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full grid place-items-center text-muted-foreground text-xs">
            Sem capa
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-3 py-1 text-xs font-bold">
            ▶ Assistir
          </div>
        </div>
        <span className="absolute top-2 left-2 rounded-md bg-background/80 backdrop-blur px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
          {item.type === "filmes" ? "Filme" : "Série"}
        </span>
      </div>
      <div className="mt-2 px-0.5">
        <h3 className="text-sm font-semibold line-clamp-1">{item.title}</h3>
        <p className="text-xs text-muted-foreground">{item.year}</p>
      </div>
    </Link>
  );
}