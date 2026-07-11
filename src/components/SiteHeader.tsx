import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-lg bg-background/70 border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center gap-4 justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground grid place-items-center font-black text-lg poster-shadow">
            M
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-black tracking-tight text-lg">maré<span className="text-primary">·</span>tv</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">onda de cinema</span>
          </div>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2 text-sm">
          <NavLink to="/" label="Início" exact />
          <NavLink to="/browse/filmes" label="Filmes" />
          <NavLink to="/browse/series" label="Séries" />
          <NavLink to="/ao-vivo" label="Ao Vivo" />
          <NavLink to="/search" label="Buscar" />
        </nav>
      </div>
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