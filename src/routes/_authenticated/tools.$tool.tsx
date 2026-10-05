import { createFileRoute, useNavigate, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { generateContent, type GenerateResult } from "@/lib/generate.functions";
import { CAPTION_TONE_SHIFTS, CTA_GOALS, DURATIONS, HOOK_STYLES, PLATFORMS, SCRIPT_STYLES, TONES, TOOLS, type ToolId } from "@/lib/tools";

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
  const [duration, setDuration] = useState<string>(DURATIONS[1]);
  const [hookStyle, setHookStyle] = useState<string>(HOOK_STYLES[0]);
  const [ctaGoal, setCtaGoal] = useState<string>(CTA_GOALS[0]);
  const [revising, setRevising] = useState<number | null>(null);
  const [toneMenu, setToneMenu] = useState<number | null>(null);
  const [hashtags, setHashtags] = useState<string[] | null>(null);
  const [hashBusy, setHashBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);

  function baseData() {
    return {
      tool: tool.id,
      input: input.trim(),
      tone,
      ...(tool.platform ? { platform } : {}),
      ...(tool.id === "script" ? { style, duration, hookStyle, ctaGoal } : {}),
      ...((tool.id === "ideas" || tool.id === "hashtag") && audience.trim() ? { audience: audience.trim() } : {}),
      ...(tool.id === "hashtag" && location.trim() ? { location: location.trim() } : {}),
    };
  }

  async function addHashtags() {
    setHashBusy(true);
    try {
      const res = await run({
        data: {
          tool: "hashtag",
          input: input.trim(),
          tone,
          ...(tool.platform ? { platform } : {}),
        },
      });
      if (res.status === "ok") setHashtags(res.blocks);
      else toast.error(res.message);
    } catch {
      toast.error("Could not generate hashtags.");
    } finally {
      setHashBusy(false);
    }
  }

  async function revise(
    index: number,
    action: "regenerate" | "shorten" | "energetic" | "style" | "expand" | "tone",
    targetTone?: string,
  ) {
    setToneMenu(null);
    if (result?.status !== "ok") return;
    const script = result.blocks[index];
    if (!script) return;
    setRevising(index);
    try {
      const res = await run({ data: { ...baseData(), revise: { action, script, ...(targetTone ? { targetTone } : {}) } } });
      if (res.status === "ok") {
        const next = res.blocks.join("\n\n");
        setResult((prev) =>
          prev?.status === "ok"
            ? { ...prev, usedThisMonth: res.usedThisMonth, blocks: prev.blocks.map((b, i) => (i === index ? next : b)) }
            : prev,
        );
      } else toast.error(res.message);
    } catch {
      toast.error("Could not update the content. Please try again.");
    } finally {
      setRevising(null);
    }
  }

  async function onGenerate() {
    if (input.trim().length < 3) {
      toast.error("Add a bit more detail first.");
      return;
    }
    setBusy(true);
    setResult(null);
    setHashtags(null);
    try {
      const res = await run({ data: baseData() });
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
            <Label>Duration</Label>
            <Chips options={[...DURATIONS]} value={duration} onChange={setDuration} />
            <Label>Hook style</Label>
            <Chips options={[...HOOK_STYLES]} value={hookStyle} onChange={setHookStyle} />
            <Label>CTA goal</Label>
            <Chips options={[...CTA_GOALS]} value={ctaGoal} onChange={setCtaGoal} />
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
            {result.blocks.map((block, index) => {
              const hasIntel = tool.id === "script" || tool.id === "caption";
              const isCta = tool.id === "caption" && /^\s*CTA/i.test(block);
              const copyText = tool.id === "improve" ? splitImprovement(block).text : hasIntel ? splitIntel(block).text : block;
              return (
              <article
                key={index}
                className="glass animate-rise rounded-2xl p-4"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <p className="text-[11px] font-medium text-accent">
                  {tool.id === "hashtag" || tool.id === "caption" ? "Section" : "Variation"} {String(index + 1).padStart(2, "0")}
                </p>
                {tool.id === "improve" ? (
                  <ImprovementBlock block={block} busy={revising === index} />
                ) : hasIntel ? (
                  <IntelBlock block={block} busy={revising === index} kind={tool.id} />
                ) : (
                  <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{block}</p>
                )}
                {tool.id === "script" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <SmallButton onClick={() => revise(index, "regenerate")}>🔄 Regenerate</SmallButton>
                    <SmallButton onClick={() => revise(index, "shorten")}>✂️ Shorten</SmallButton>
                    <SmallButton onClick={() => revise(index, "energetic")}>🔥 More energetic</SmallButton>
                    <SmallButton onClick={() => revise(index, "style")}>🎭 Use “{style}” style</SmallButton>
                  </div>
                ) : null}
                {tool.id === "caption" && !isCta ? (
                  <>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <SmallButton onClick={() => revise(index, "regenerate")}>🔄 Regenerate</SmallButton>
                      <SmallButton onClick={() => revise(index, "shorten")}>✂️ Shorten</SmallButton>
                      <SmallButton onClick={() => revise(index, "expand")}>➕ Expand</SmallButton>
                      <SmallButton onClick={() => setToneMenu(toneMenu === index ? null : index)}>
                        🔥 Change tone
                      </SmallButton>
                    </div>
                    {toneMenu === index ? (
                      <div className="mt-2 flex flex-wrap gap-2 rounded-xl border border-border bg-foreground/5 p-2">
                        {CAPTION_TONE_SHIFTS.map((shift) => (
                          <SmallButton key={shift.label} onClick={() => revise(index, "tone", shift.tone)}>
                            {shift.label}
                          </SmallButton>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : null}
                {tool.id === "improve" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <SmallButton disabled={revising !== null} onClick={() => revise(index, "regenerate")}>🔄 Regenerate</SmallButton>
                    <SmallButton disabled={revising !== null} onClick={() => revise(index, "shorten")}>✂️ Make shorter</SmallButton>
                    <SmallButton disabled={revising !== null} onClick={() => revise(index, "energetic")}>🔥 More energetic</SmallButton>
                    <SmallButton disabled={revising !== null} onClick={() => revise(index, "tone", "emotional and heartfelt")}>❤️ More emotional</SmallButton>
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <SmallButton
                    onClick={() => {
                      void navigator.clipboard.writeText(copyText);
                      toast.success("Copied");
                    }}
                  >
                    {hasIntel || tool.id === "improve" ? "📋 Copy" : "Copy"}
                  </SmallButton>
                  <SmallButton onClick={() => saveToLibrary(copyText)}>Save</SmallButton>
                  <SmallButton onClick={() => openInWorkspace(copyText)}>Open in workspace</SmallButton>
                </div>
              </article>
              );
            })}
            {tool.id === "caption" ? (
              hashtags ? (
                <article className="glass rounded-2xl p-4">
                  <p className="text-[11px] font-medium text-accent">#️⃣ Hashtags (separate from your caption)</p>
                  {hashtags.map((h, i) => (
                    <div key={i} className="mt-3 border-t border-border pt-3 first:border-0 first:pt-0">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{h}</p>
                      <div className="mt-2">
                        <SmallButton
                          onClick={() => {
                            void navigator.clipboard.writeText(h);
                            toast.success("Copied");
                          }}
                        >
                          📋 Copy
                        </SmallButton>
                      </div>
                    </div>
                  ))}
                </article>
              ) : (
                <button
                  onClick={addHashtags}
                  disabled={hashBusy}
                  className="w-full rounded-xl border border-accent/40 bg-accent/10 py-3 text-sm font-semibold text-accent disabled:opacity-60"
                >
                  {hashBusy ? "Building hashtag strategy…" : "#️⃣ Add hashtags"}
                </button>
              )
            ) : null}
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
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="h-auto min-h-8 whitespace-normal rounded-lg border-border bg-foreground/10 px-3 py-1.5 text-left text-[12px]"
    >
      {children}
    </Button>
  );
}

const REPORT_KEYS = ["Hook", "Clarity", "Structure", "CTA", "Overall Improvement"] as const;

function splitImprovement(block: string) {
  const reportStart = block.search(/^\s*IMPROVEMENT REPORT\s*$/im);
  const changesStart = block.search(/^\s*EXPLAIN CHANGES\s*$/im);
  const textEnd = reportStart >= 0 ? reportStart : changesStart >= 0 ? changesStart : block.length;
  const text = block.slice(0, textEnd).trim().replace(/^IMPROVED VERSION\s*\n?/i, "").trim();
  const report = reportStart >= 0
    ? (block.slice(reportStart).split(/^\s*EXPLAIN CHANGES\s*$/im)[0] ?? "").replace(/^\s*IMPROVEMENT REPORT\s*$/im, "").trim()
    : "";
  const rows = REPORT_KEYS.map((key) => {
    const line = report.split("\n").find((item) => item.trim().toLowerCase().startsWith(`${key.toLowerCase()}:`));
    return line ? { key, value: line.slice(line.indexOf(":") + 1).trim() } : null;
  }).filter((row): row is { key: typeof REPORT_KEYS[number]; value: string } => row !== null);
  const changes = changesStart >= 0
    ? block.slice(changesStart).replace(/^\s*EXPLAIN CHANGES\s*$/im, "").trim().split("\n").map((line) => line.replace(/^\s*[-•]\s*/, "").trim()).filter(Boolean).slice(0, 4)
    : [];
  return { text, rows, changes };
}

function ImprovementBlock({ block, busy }: { block: string; busy: boolean }) {
  const { text, rows, changes } = splitImprovement(block);
  return (
    <div className={busy ? "animate-pulse opacity-60" : undefined} aria-busy={busy}>
      <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
      {rows.length > 0 ? (
        <div className="mt-4 border-t border-border pt-3">
          <h3 className="text-[11px] font-bold tracking-[0.1em] text-accent uppercase">Improvement report</h3>
          <dl className="mt-2 grid gap-2 sm:grid-cols-2">
            {rows.map(({ key, value }) => (
              <div key={key} className={key === "Overall Improvement" ? "min-w-0 sm:col-span-2" : "min-w-0"}>
                <dt className="text-[11px] text-muted-foreground">{key}</dt>
                <dd className="text-xs leading-relaxed font-medium wrap-break-word">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
      {changes.length > 0 ? (
        <div className="mt-4 border-t border-border pt-3">
          <h3 className="text-[11px] font-bold tracking-[0.1em] text-accent uppercase">What changed</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-muted-foreground">
            {changes.map((change, i) => <li key={i}>{change}</li>)}
          </ul>
        </div>
      ) : null}
    </div>
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

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
      {children}
    </p>
  );
}

const INTEL_ICONS: Record<string, string> = {
  "hook strength": "🎯",
  "story arc": "📖",
  "emotional trigger": "❤️",
  cta: "⚡",
  "estimated duration": "⏱️",
  "best for": "📱",
  hook: "🎯",
  readability: "👀",
  "emotional angle": "❤️",
  "cta strength": "⚡",
  "platform fit": "📱",
  "reading time": "⏱️",
};

function splitIntel(block: string) {
  const parts = block.split(/^\s*INTELLIGENCE\s*$/m);
  const rows = (parts[1] ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.includes(":"))
    .map((line) => {
      const i = line.indexOf(":");
      return { key: line.slice(0, i).trim(), value: line.slice(i + 1).trim() };
    })
    .filter((row) => INTEL_ICONS[row.key.toLowerCase()]);
  return { text: (parts[0] ?? "").trim(), rows };
}

function IntelBlock({ block, busy, kind }: { block: string; busy: boolean; kind: string }) {
  const { text, rows } = splitIntel(block);
  return (
    <div className={busy ? "animate-pulse opacity-60" : undefined}>
      <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
      {rows.length ? (
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-border bg-foreground/5 p-3">
          <p className="col-span-2 text-[10px] font-bold tracking-[0.14em] text-accent">
            {kind === "caption" ? "📊 CAPTION INTELLIGENCE" : "SCRIPT INTELLIGENCE"}
          </p>
          {rows.map((row) => (
            <div
              key={row.key}
              className={row.key.toLowerCase() === "platform fit" ? "col-span-2 min-w-0" : "min-w-0"}
            >
              <p className="text-[10px] text-muted-foreground">
                {INTEL_ICONS[row.key.toLowerCase()]} {row.key}
              </p>
              <p
                className={
                  row.key.toLowerCase() === "platform fit"
                    ? "text-[12px] font-medium"
                    : "truncate text-[12px] font-medium"
                }
              >
                {row.value}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
