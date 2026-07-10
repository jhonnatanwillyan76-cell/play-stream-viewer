import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export function SiteHeader() {
  const navigate = useNavigate();
  const currentQ = useRouterState({
    select: (s) =>
      (s.location.search as { q?: string } | undefined)?.q ?? "",
  });
  const [q, setQ] = useState(currentQ);
  useEffect(() => setQ(currentQ), [currentQ]);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-lg bg-background/70 border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center gap-4 justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center font-black text-lg poster-shadow">
            B
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-black tracking-tight text-lg">BLUDV<span className="text-primary">·</span>flix</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">stream cinema</span>
          </div>
        </Link>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const term = q.trim();
            if (!term) return;
            navigate({ to: "/search", search: { q: term } });
          }}
          className="hidden md:flex flex-1 max-w-md"
        >
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar filmes ou séries…"
            className="w-full rounded-full bg-secondary/70 border border-border px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/60"
          />
        </form>
        <nav className="flex items-center gap-1 sm:gap-2 text-sm">
          <NavLink to="/" label="Início" exact />
          <NavLink to="/browse/filmes" label="Filmes" />
          <NavLink to="/browse/series" label="Séries" />
          <NavLink to="/ao-vivo" label="Ao Vivo" />
        </nav>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const term = q.trim();
          if (!term) return;
          navigate({ to: "/search", search: { q: term } });
        }}
        className="md:hidden px-4 pb-3"
      >
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar…"
          className="w-full rounded-full bg-secondary/70 border border-border px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/60"
        />
      </form>
    </header>
  );
}

function NavLink({ to, label, exact }: { to: string; label: string; exact?: boolean }) {
  return (
    <Link
      to={to}
      activeOptions={{ exact }}
      className="px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      activeProps={{ className: "px-3 py-2 rounded-md text-foreground bg-secondary" }}
    >
      {label}
    </Link>
  );
}