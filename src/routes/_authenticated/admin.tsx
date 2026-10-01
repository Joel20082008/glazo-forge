import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { AppShell } from "@/components/app-shell";
import { getAdminStats } from "@/lib/admin.functions";
import { TOOLS, type ToolId } from "@/lib/tools";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — ViralForge" },
      { name: "description", content: "Platform usage, subscriptions and generation stats." },
      { property: "og:title", content: "Admin — ViralForge" },
      {
        property: "og:description",
        content: "Platform usage, subscriptions and generation stats.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Admin,
});

function Admin() {
  const fetchStats = useServerFn(getAdminStats);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => fetchStats(),
  });

  return (
    <AppShell>
      <section className="mt-8 animate-rise">
        <h1 className="font-display text-2xl font-bold">Admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Live platform numbers, read straight from the database.
        </p>
      </section>

      {isLoading ? (
        <p className="glass mt-5 rounded-2xl p-4 text-[12px] text-muted-foreground">Loading…</p>
      ) : !data?.allowed ? (
        <p className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-[13px] text-destructive">
          You don't have admin access.
        </p>
      ) : (
        <>
          <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Users" value={data.users} />
            <Stat label="Active (30d)" value={data.activeUsers} accent />
            <Stat label="Generations" value={data.generations} />
            <Stat label="This month" value={data.generationsThisMonth} />
            <Stat label="Projects" value={data.projects} />
            <Stat label="Saved items" value={data.savedItems} />
          </section>

          <section className="glass mt-4 rounded-2xl p-4">
            <h2 className="font-display text-sm font-semibold">Subscriptions</h2>
            <div className="mt-2 space-y-1">
              {Object.entries(data.plans).map(([plan, count]) => (
                <div key={plan} className="flex justify-between text-[13px]">
                  <span className="capitalize text-muted-foreground">{plan}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 rounded-xl border border-accent/30 bg-accent/10 p-3 text-[12px] text-accent">
              REQUIRES CONFIGURATION — plans reflect database values only; no billing provider is
              connected, so revenue figures are unavailable.
            </p>
          </section>

          <section className="glass mt-4 rounded-2xl p-4">
            <h2 className="font-display text-sm font-semibold">Tool usage (last 30 days)</h2>
            {data.topTools.length === 0 ? (
              <p className="mt-2 text-[12px] text-muted-foreground">No generations yet.</p>
            ) : (
              <div className="mt-2 space-y-1">
                {data.topTools.map((row) => (
                  <div key={row.tool} className="flex justify-between text-[13px]">
                    <span className="text-muted-foreground">
                      {TOOLS[row.tool as ToolId]?.name ?? row.tool}
                    </span>
                    <span className="font-medium">{row.count}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="glass rounded-2xl p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`font-display mt-1 text-2xl font-semibold ${accent ? "text-accent" : ""}`}>
        {value}
      </p>
    </div>
  );
}
