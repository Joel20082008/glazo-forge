import { createFileRoute, Link } from "@tanstack/react-router";

import { BrandMark } from "@/components/brand-mark";
import { GlowBackdrop } from "@/components/glow-backdrop";
import { TOOL_LIST } from "@/lib/tools";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ViralForge — Forge ideas into content that gets attention" },
      {
        name: "description",
        content:
          "AI hooks, scripts, captions and hashtags for TikTok, Reels, Shorts and X. Turn one idea into a week of content.",
      },
      { property: "og:title", content: "ViralForge — AI content studio for short-form creators" },
      {
        property: "og:description",
        content:
          "Generate hooks, scripts, captions, hashtags and ideas, then repurpose and improve them in one workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <GlowBackdrop />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 pt-6 pb-16">
        <header className="flex items-center justify-between">
          <BrandMark />
          <Link
            to="/auth"
            className="rounded-full border border-border bg-foreground/5 px-4 py-1.5 text-[12px] font-medium"
          >
            Sign in
          </Link>
        </header>

        <section className="mt-12 animate-rise">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-medium text-accent">
            <span className="size-1.5 rounded-full bg-accent" /> AI Content Studio
          </span>
          <h1 className="font-display mt-4 text-[34px] leading-[1.02] font-bold tracking-tight sm:text-6xl">
            Turn one idea into a week of <span className="text-accent">viral</span> content.
          </h1>
          <p className="mt-3 max-w-[460px] text-sm leading-relaxed text-muted-foreground sm:text-base">
            Hooks, scripts, captions and hashtags — generated, repurposed and ready to post in
            seconds for TikTok, Reels, Shorts and X.
          </p>
          <Link
            to="/auth"
            className="font-display mt-7 inline-flex w-full items-center justify-center rounded-xl bg-accent py-3.5 text-sm font-bold text-accent-foreground sm:w-auto sm:px-8"
          >
            Start forging free
          </Link>
        </section>

        <section className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              AI Tools
            </h2>
            <span className="text-[11px] text-muted-foreground">{TOOL_LIST.length} tools</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TOOL_LIST.map((tool) => (
              <div key={tool.id} className="glass rounded-2xl p-4">
                <div className="grid size-9 place-items-center rounded-lg bg-accent/15 text-accent">
                  {tool.icon}
                </div>
                <p className="font-display mt-3 text-sm font-semibold">{tool.name}</p>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  {tool.tagline}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Plans
            </h2>
            <span className="text-[11px] text-muted-foreground">Payments require configuration</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { name: "Free", gens: "25 generations / month", projects: "10 projects" },
              { name: "Pro", gens: "500 generations / month", projects: "200 projects" },
              { name: "Premium", gens: "5,000 generations / month", projects: "2,000 projects" },
            ].map((plan) => (
              <div key={plan.name} className="glass rounded-2xl p-4">
                <p className="font-display text-base font-semibold">{plan.name}</p>
                <p className="mt-2 text-[12px] text-muted-foreground">{plan.gens}</p>
                <p className="text-[12px] text-muted-foreground">{plan.projects}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-12 flex items-center justify-between border-t border-border pt-5">
          <span className="font-display text-sm font-semibold">ViralForge</span>
          <span className="text-[11px] text-muted-foreground">Forge · Shape · Post</span>
        </footer>
      </div>
    </div>
  );
}
