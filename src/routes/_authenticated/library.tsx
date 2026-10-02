import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { TOOLS, type ToolId } from "@/lib/tools";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [
      { title: "Library — Glazo Forge" },
      { name: "description", content: "Your saved hooks, scripts, captions, ideas and projects." },
      { property: "og:title", content: "Library — Glazo Forge" },
      {
        property: "og:description",
        content: "Your saved hooks, scripts, captions, ideas and projects.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Library,
});

const FILTERS = ["all", "hook", "script", "caption", "hashtag", "ideas", "repurpose", "improve"];

function Library() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"saved" | "projects">("saved");
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");

  const saved = useQuery({
    queryKey: ["saved-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_items")
        .select("id, kind, title, body, platform, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, title, tool, platform, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const term = search.trim().toLowerCase();
  const savedItems = (saved.data ?? []).filter(
    (item) =>
      (kind === "all" || item.kind === kind) &&
      (!term ||
        item.title.toLowerCase().includes(term) ||
        item.body.toLowerCase().includes(term)),
  );
  const projectItems = (projects.data ?? []).filter(
    (project) =>
      (kind === "all" || project.tool === kind) &&
      (!term || project.title.toLowerCase().includes(term)),
  );

  async function removeSaved(id: string) {
    const { error } = await supabase.from("saved_items").delete().eq("id", id);
    if (error) toast.error("Could not delete.");
    else {
      toast.success("Deleted");
      await queryClient.invalidateQueries({ queryKey: ["saved-items"] });
    }
  }

  return (
    <AppShell>
      <section className="mt-8 animate-rise">
        <h1 className="font-display text-2xl font-bold">Library</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Everything you saved, searchable and filterable.
        </p>
      </section>

      <div className="mt-5 flex gap-2">
        {(["saved", "projects"] as const).map((value) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={
              tab === value
                ? "rounded-full bg-accent px-4 py-1.5 text-[12px] font-semibold text-accent-foreground capitalize"
                : "rounded-full border border-border bg-foreground/5 px-4 py-1.5 text-[12px] text-muted-foreground capitalize"
            }
          >
            {value}
          </button>
        ))}
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search your content…"
        className="mt-3 w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-accent/60"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {FILTERS.map((value) => (
          <button
            key={value}
            onClick={() => setKind(value)}
            className={
              kind === value
                ? "rounded-full bg-foreground/15 px-3 py-1 text-[11px] font-semibold"
                : "rounded-full border border-border px-3 py-1 text-[11px] text-muted-foreground"
            }
          >
            {value === "all" ? "All" : TOOLS[value as ToolId].name.replace(" Generator", "")}
          </button>
        ))}
      </div>

      <section className="mt-5 space-y-3">
        {tab === "saved"
          ? savedItems.map((item) => (
              <article key={item.id} className="glass rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display truncate text-sm font-semibold">
                      {item.title || TOOLS[item.kind as ToolId]?.name || "Saved item"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {TOOLS[item.kind as ToolId]?.name ?? item.kind}
                      {item.platform ? ` · ${item.platform}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => removeSaved(item.id)}
                    className="shrink-0 rounded-lg border border-border px-2 py-1 text-[11px] text-muted-foreground"
                  >
                    Delete
                  </button>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed whitespace-pre-wrap text-foreground/80">
                  {item.body}
                </p>
              </article>
            ))
          : projectItems.map((project) => (
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

        {(tab === "saved" ? savedItems : projectItems).length === 0 ? (
          <p className="glass rounded-2xl p-4 text-[12px] text-muted-foreground">
            Nothing here yet.
          </p>
        ) : null}
      </section>
    </AppShell>
  );
}
