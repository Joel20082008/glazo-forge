import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { PLAN_LIMITS, TOOL_LIST } from "@/lib/tools";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Glazo Forge" },
      { name: "description", content: "Your content stats, recent projects and AI tools." },
      { property: "og:title", content: "Dashboard — Glazo Forge" },
      {
        property: "og:description",
        content: "Your content stats, recent projects and AI tools.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function monthStart() {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) throw new Error("No session");

      const [profile, projects, savedCount, totalGen, monthGen] = await Promise.all([
        supabase.from("profiles").select("display_name, plan").eq("id", user.id).maybeSingle(),
        supabase
          .from("projects")
          .select("id, title, tool, platform, updated_at")
          .order("updated_at", { ascending: false })
          .limit(5),
        supabase.from("saved_items").select("id", { count: "exact", head: true }),
        supabase.from("generations").select("id", { count: "exact", head: true }),
        supabase
          .from("generations")
          .select("id", { count: "exact", head: true })
          .gte("created_at", monthStart()),
      ]);

      return {
        email: user.email ?? "",
        name: profile.data?.display_name ?? user.email?.split("@")[0] ?? "creator",
        plan: profile.data?.plan ?? "free",
        projects: projects.data ?? [],
        saved: savedCount.count ?? 0,
        total: totalGen.count ?? 0,
        month: monthGen.count ?? 0,
      };
    },
  });

  const plan = data?.plan ?? "free";
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS["free"]!;
  const initials = (data?.name ?? "··").slice(0, 2).toUpperCase();

  return (
    <AppShell plan={limits.label} initials={initials}>
      <section className="mt-8 animate-rise">
        <h1 className="font-display text-[30px] leading-tight font-bold">
          Welcome back, <span className="text-accent">{data?.name ?? "…"}</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a tool and forge something worth posting today.
        </p>
      </section>

      <section className="mt-6 grid grid-cols-3 gap-3">
        <Stat label="Generated" value={data?.total ?? 0} />
        <Stat label="This month" value={`${data?.month ?? 0}/${limits.generations}`} accent />
        <Stat label="Saved ideas" value={data?.saved ?? 0} />
      </section>

      <section className="glass mt-3 rounded-2xl p-4">
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-muted-foreground">
            {limits.label} plan · {limits.generations} generations / month
          </span>
          <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] text-muted-foreground">
            Billing: requires configuration
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full rounded-full bg-accent"
            style={{
              width: `${Math.min(100, ((data?.month ?? 0) / limits.generations) * 100)}%`,
            }}
          />
        </div>
      </section>

      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Quick create
          </h2>
          <span className="text-[11px] text-muted-foreground">{TOOL_LIST.length} tools</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TOOL_LIST.map((tool) => (
            <Link
              key={tool.id}
              to="/tools/$tool"
              params={{ tool: tool.id }}
              className="glass rounded-2xl p-4 transition-transform hover:-translate-y-0.5"
            >
              <div className="grid size-9 place-items-center rounded-lg bg-accent/15 text-accent">
                {tool.icon}
              </div>
              <p className="font-display mt-3 text-sm font-semibold">{tool.name}</p>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{tool.tagline}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Recent projects
          </h2>
          <Link to="/library" className="text-[11px] text-muted-foreground">
            View all
          </Link>
        </div>
        {data && data.projects.length === 0 ? (
          <p className="glass rounded-2xl p-4 text-[12px] text-muted-foreground">
            No projects yet. Generate something and save it to your workspace.
          </p>
        ) : (
          <div className="space-y-2">
            {(data?.projects ?? []).map((project) => (
              <Link
                key={project.id}
                to="/workspace/$projectId"
                params={{ projectId: project.id }}
                className="glass flex items-center gap-3 rounded-xl p-3"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/20 text-brand">
                  {project.tool.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{project.title}</span>
                  <span className="block text-[12px] text-muted-foreground">
                    {project.platform ?? project.tool} ·{" "}
                    {new Date(project.updated_at).toLocaleDateString()}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="glass rounded-2xl p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={`font-display mt-1 text-2xl font-semibold ${accent ? "text-accent" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
