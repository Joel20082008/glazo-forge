import { Link } from "@tanstack/react-router";

export function BrandMark({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2">
      <span className="font-display grid size-8 place-items-center rounded-lg bg-accent font-bold text-accent-foreground">
        V
      </span>
      <span className="font-display text-lg font-bold tracking-tight">Glazo Forge</span>
    </Link>
  );
}
