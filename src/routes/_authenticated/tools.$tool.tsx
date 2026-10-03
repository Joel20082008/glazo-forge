import { createFileRoute, useNavigate, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { generateContent, type GenerateResult } from "@/lib/generate.functions";
import { PLATFORMS, SCRIPT_STYLES, TONES, TOOLS, type ToolId } from "@/lib/tools";

export const Route = createFileRoute("/_authenticated/tools/$tool")({
  head: () => ({
    meta: [
      { title: "AI tools — Glazo Forge" },
      { name: "description", content: "Generate hooks, scripts, captions, hashtags and ideas." },
      { property: "og:title", content: "AI tools — Glazo Forge" },
      {
        property: "og:description",
        content: "Generate hooks, scripts, captions, hashtags and ideas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ToolPage,
});

function ToolPage() {
  const { tool: toolParam } = Route.useParams();
  const navigate = useNavigate();
  const run = useServerFn(generateContent);
  const tool = TOOLS[toolParam as ToolId];
  if (!tool) throw notFound();

  const [input, setInput] = useState("");
  const [tone, setTone] = useState<string>(TONES[0]);
  const [platform, setPlatform] = useState<string>(PLATFORMS[0]);
  const [style, setStyle] = useState<string>(SCRIPT_STYLES[0]);
  const [audience, setAudience] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);

  async function onGenerate() {
    if (input.trim().length < 3) {
      toast.error("Add a bit more detail first.");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await run({
        data: {
          tool: tool.id,
          input: input.trim(),
          tone,
          ...(tool.platform ? { platform } : {}),
          ...(tool.id === "script" ? { style } : {}),
          ...((tool.id === "ideas" || tool.id === "hashtag") && audience.trim() ? { audience: audience.trim() } : {}),
          ...(tool.id === "hashtag" && location.trim() ? { location: location.trim() } : {}),
        },
      });
      setResult(res);
      if (res.status === "error") toast.error(res.message);
    } catch {
      toast.error("Generation failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function saveToLibrary(body: string) {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { error } = await supabase.from("saved_items").insert({
      user_id: auth.user.id,
      kind: tool.id,
      title: input.trim().slice(0, 80),
      body,
      platform: tool.platform ? platform : null,
      tone,
    });
    if (error) toast.error("Could not save.");
    else toast.success("Saved to your library.");
  }

  async function openInWorkspace(body: string) {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: auth.user.id,
        title: input.trim().slice(0, 80) || tool.name,
        tool: tool.id,
        platform: tool.platform ? platform : null,
        tone,
        input: input.trim(),
        content: body,
      })
      .select("id")
      .single();
    if (error || !data) {
      toast.error("Could not create the project.");
      return;
    }
    navigate({ to: "/workspace/$projectId", params: { projectId: data.id } });
  }

  return (
    <AppShell>
      <section className="mt-8 animate-rise">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-accent/15 text-accent">
            {tool.icon}
          </span>
          <h1 className="font-display text-2xl font-bold">{tool.name}</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{tool.tagline}</p>
      </section>

      <section className="glass mt-5 rounded-2xl p-4">
        <label className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
          {tool.inputLabel}
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={tool.longInput ? 7 : 3}
          placeholder={tool.placeholder}
          className="mt-2 w-full resize-none rounded-xl border border-input bg-background/60 p-3 text-sm outline-none focus:border-accent/60"
        />

        {tool.platform ? (
          <>
            <p className="mt-4 text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Platform
            </p>
            <Chips options={[...PLATFORMS]} value={platform} onChange={setPlatform} />
          </>
        ) : null}

        {tool.id === "script" ? (
          <>
            <p className="mt-4 text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Script style
            </p>
            <Chips options={[...SCRIPT_STYLES]} value={style} onChange={setStyle} />
          </>
        ) : null}

        <p className="mt-4 text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
          Tone
        </p>
        <Chips options={[...TONES]} value={tone} onChange={setTone} />

        {tool.id === "hashtag" ? (
          <>
            <input
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="Target audience (optional, e.g. student creators)"
              className="mt-4 w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-accent/60"
            />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location (optional, e.g. Lagos, Nigeria)"
              className="mt-2 w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-accent/60"
            />
          </>
        ) : null}

        {tool.id === "ideas" ? (
          <input
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="Audience (e.g. first-time founders)"
            className="mt-4 w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-accent/60"
          />
        ) : null}

        <button
          onClick={onGenerate}
          disabled={busy}
          className="font-display mt-5 w-full rounded-xl bg-accent py-3.5 text-sm font-bold text-accent-foreground disabled:opacity-60"
        >
          {busy ? "Forging…" : "Generate"}
        </button>
      </section>

      {result?.status === "needs_configuration" ? (
        <Notice
          tag="REQUIRES CONFIGURATION"
          body={`${result.message} Add an AI provider key to the app environment to enable generation.`}
        />
      ) : null}
      {result?.status === "limit_reached" ? (
        <Notice tag="USAGE LIMIT" body={result.message} />
      ) : null}
      {result?.status === "error" ? <Notice tag="ERROR" body={result.message} /> : null}

      {result?.status === "ok" ? (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Results
            </h2>
            <span className="text-[11px] text-muted-foreground">
              {result.blocks.length} {tool.id === "hashtag" ? "sections" : "variations"}
            </span>
          </div>
          <div className="space-y-3">
            {result.blocks.map((block, index) => (
              <article
                key={index}
                className="glass animate-rise rounded-2xl p-4"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <p className="text-[11px] font-medium text-accent">
                  {tool.id === "hashtag" ? "Section" : "Variation"} {String(index + 1).padStart(2, "0")}
                </p>
                <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{block}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <SmallButton
                    onClick={() => {
                      void navigator.clipboard.writeText(block);
                      toast.success("Copied");
                    }}
                  >
                    Copy
                  </SmallButton>
                  <SmallButton onClick={() => saveToLibrary(block)}>Save</SmallButton>
                  <SmallButton onClick={() => openInWorkspace(block)}>Open in workspace</SmallButton>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}

function Chips({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={
            option === value
              ? "rounded-full bg-accent px-3 py-1.5 text-[12px] font-semibold text-accent-foreground"
              : "rounded-full border border-border bg-foreground/5 px-3 py-1.5 text-[12px] text-muted-foreground"
          }
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function SmallButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-border bg-foreground/10 px-3 py-1.5 text-[12px] font-medium"
    >
      {children}
    </button>
  );
}

function Notice({ tag, body }: { tag: string; body: string }) {
  return (
    <div className="mt-5 rounded-2xl border border-accent/30 bg-accent/10 p-4">
      <p className="text-[10px] font-bold tracking-[0.14em] text-accent">{tag}</p>
      <p className="mt-1 text-[13px] text-foreground/80">{body}</p>
    </div>
  );
}
