import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { BrandMark } from "./brand-mark";
import { GlowBackdrop } from "./glow-backdrop";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/dashboard", label: "Tools", icon: "⚡" },
  { to: "/library", label: "Library", icon: "📚" },
  { to: "/profile", label: "Profile", icon: "⚙️" },
] as const;

export function AppShell({
  children,
  plan,
  initials,
}: {
  children: ReactNode;
  plan?: string;
  initials?: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <GlowBackdrop />
      <div className="relative z-10 mx-auto w-full max-w-5xl px-5 pt-6 pb-28">
        <header className="flex items-center justify-between">
          <BrandMark to="/dashboard" />
          <div className="flex items-center gap-2">
            {plan ? (
              <span className="rounded-full border border-border bg-foreground/5 px-3 py-1 text-[11px] font-medium text-muted-foreground capitalize">
                {plan}
              </span>
            ) : null}
            <span className="grid size-8 place-items-center rounded-full bg-brand/30 text-xs font-semibold">
              {initials ?? "··"}
            </span>
            <button
              onClick={signOut}
              className="rounded-full border border-border px-3 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        </header>
        {children}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto grid max-w-5xl grid-cols-3 px-2 py-2">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center gap-1 text-muted-foreground"
              activeProps={{ className: "flex flex-col items-center gap-1 text-accent" }}
            >
              <span className="text-base">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
