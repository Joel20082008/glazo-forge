import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { generateContent } from "@/lib/generate.functions";
import { TOOLS, type ToolId } from "@/lib/tools";

export const Route = createFileRoute("/_authenticated/workspace/$projectId")({
  head: () => ({
    meta: [
      { title: "Workspace — Glazo Forge" },
      { name: "description", content: "Edit, regenerate and version your generated content." },
      { property: "og:title", content: "Workspace — Glazo Forge" },
      {
        property: "og:description",
        content: "Edit, regenerate and version your generated content.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Workspace,
});

function Workspace() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const run = useServerFn(generateContent);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  const project = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const versions = useQuery({
    queryKey: ["project-versions", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_versions")
        .select("id, content, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (project.data) {
      setTitle(project.data.title);
      setContent(project.data.content);
    }
  }, [project.data]);

  async function save() {
    const current = project.data;
    if (!current) return;
    setBusy(true);
    if (current.content && current.content !== content) {
      await supabase.from("project_versions").insert({
        project_id: projectId,
        user_id: current.user_id,
        content: current.content,
      });
    }
    const { error } = await supabase
      .from("projects")
      .update({ title, content, updated_at: new Date().toISOString() })
      .eq("id", projectId);
    setBusy(false);
    if (error) {
      toast.error("Could not save.");
      return;
    }
    toast.success("Saved");
    await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    await queryClient.invalidateQueries({ queryKey: ["project-versions", projectId] });
  }

  async function regenerate() {
    const current = project.data;
    if (!current) return;
    setBusy(true);
    try {
      const result = await run({
        data: {
          tool: current.tool as ToolId,
          input: current.input || content,
          ...(current.tone ? { tone: current.tone } : {}),
          ...(current.platform ? { platform: current.platform } : {}),
        },
      });
      if (result.status !== "ok") {
        toast.error(result.message);
        return;
      }
      await supabase.from("project_versions").insert({
        project_id: projectId,
        user_id: current.user_id,
        content,
      });
      setContent(result.blocks[0] ?? result.raw);
      toast.success("Regenerated — review and save.");
      await queryClient.invalidateQueries({ queryKey: ["project-versions", projectId] });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const { error } = await supabase.from("projects").delete().eq("id", projectId);
    if (error) {
      toast.error("Could not delete.");
      return;
    }
    toast.success("Project deleted");
    navigate({ to: "/library" });
  }

  const toolName = project.data ? (TOOLS[project.data.tool as ToolId]?.name ?? "Project") : "";

  return (
    <AppShell>
      <section className="mt-8 animate-rise">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="font-display w-full bg-transparent text-2xl font-bold outline-none"
          placeholder="Project title"
        />
        <p className="mt-1 text-[12px] text-muted-foreground">
          {toolName}
          {project.data?.platform ? ` · ${project.data.platform}` : ""}
        </p>
      </section>

      <section className="glass mt-5 rounded-2xl p-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={14}
          className="w-full resize-none rounded-xl border border-input bg-background/60 p-3 text-sm leading-relaxed outline-none focus:border-accent/60"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={save}
            disabled={busy}
            className="font-display rounded-lg bg-accent px-4 py-2 text-[13px] font-bold text-accent-foreground disabled:opacity-60"
          >
            Save
          </button>
          <button
            onClick={regenerate}
            disabled={busy}
            className="rounded-lg border border-border bg-foreground/10 px-4 py-2 text-[13px] font-medium disabled:opacity-60"
          >
            {busy ? "Working…" : "Regenerate"}
          </button>
          <button
            onClick={() => {
              void navigator.clipboard.writeText(content);
              toast.success("Copied");
            }}
            className="rounded-lg border border-border bg-foreground/10 px-4 py-2 text-[13px] font-medium"
          >
            Copy
          </button>
          <button
            onClick={remove}
            className="rounded-lg border border-destructive/40 px-4 py-2 text-[13px] font-medium text-destructive"
          >
            Delete
          </button>
        </div>
      </section>

      <section className="mt-7">
        <h2 className="font-display mb-3 text-sm font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Previous versions
        </h2>
        {(versions.data ?? []).length === 0 ? (
          <p className="glass rounded-2xl p-4 text-[12px] text-muted-foreground">
            No earlier versions yet.
          </p>
        ) : (
          <div className="space-y-2">
            {(versions.data ?? []).map((version) => (
              <article key={version.id} className="glass rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(version.created_at).toLocaleString()}
                  </p>
                  <button
                    onClick={() => setContent(version.content)}
                    className="rounded-lg border border-border px-2 py-1 text-[11px]"
                  >
                    Restore
                  </button>
                </div>
                <p className="mt-2 line-clamp-3 text-[12px] whitespace-pre-wrap text-foreground/70">
                  {version.content}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
