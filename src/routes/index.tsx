import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { BrandMark } from "@/components/brand-mark";
import { GlowBackdrop } from "@/components/glow-backdrop";
import { PLAN_LIMITS, TOOL_LIST } from "@/lib/tools";

const NGN = "\u20A6";

const PLAN_CTA: Record<string, string> = {
  free: "Get Started",
  pro: "Upgrade to Pro",
  premium: "Go Premium",
};

const PLAN_CARDS = Object.entries(PLAN_LIMITS).map(([id, plan]) => ({
  id,
  label: plan.label,
  priceNgn: plan.priceNgn,
  generations: plan.generations,
  projects: plan.projects,
  videos: plan.videos,
  cta: PLAN_CTA[id] ?? "Get Started",
  popular: id === "pro",
}));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Glazo Forge — Forge ideas into content that gets attention" },
      {
        name: "description",
        content:
          "AI hooks, scripts, captions and hashtags for TikTok, Reels, Shorts and X. Turn one idea into a week of content.",
      },
      { property: "og:title", content: "Glazo Forge — AI content studio for short-form creators" },
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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <h2 className="font-display text-sm font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Plans
            </h2>
            <span className="text-[11px] text-muted-foreground">Payments require configuration</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {PLAN_CARDS.map((plan) => (
              <div
                key={plan.id}
                className={`glass relative flex flex-col rounded-2xl p-4 ${
                  plan.popular ? "ring-1 ring-accent/40" : ""
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-2 right-4 rounded-full border border-accent/40 bg-background px-2 py-0.5 text-[9px] font-semibold tracking-[0.12em] text-accent uppercase">
                    Most popular
                  </span>
                )}
                <p className="font-display text-base font-semibold">{plan.label}</p>
                <p className="font-display mt-2 flex items-baseline gap-1.5 text-[28px] leading-none font-bold tracking-tight">
                  <span>
                    {NGN}
                    {plan.priceNgn.toLocaleString("en-NG")}
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground">/ month</span>
                </p>
                <div className="mt-3 space-y-0.5">
                  <p className="text-[12px] text-muted-foreground">
                    {plan.generations.toLocaleString("en-NG")} generations / month
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    {plan.projects.toLocaleString("en-NG")} projects
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    {plan.videos.toLocaleString("en-NG")} AI videos / month
                  </p>
                </div>
                {plan.id === "free" ? (
                  <Link
                    to="/auth"
                    className="font-display mt-4 inline-flex w-full items-center justify-center rounded-xl bg-accent py-2.5 text-[13px] font-bold text-accent-foreground"
                  >
                    {plan.cta}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      toast.info(`${plan.label} plan`, {
                        description:
                          "Payments require configuration — this plan can't be purchased yet.",
                      })
                    }
                    className={`font-display mt-4 inline-flex w-full items-center justify-center rounded-xl py-2.5 text-[13px] font-bold ${
                      plan.popular
                        ? "bg-accent text-accent-foreground"
                        : "border border-border bg-foreground/5"
                    }`}
                  >
                    {plan.cta}
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Monthly plans • Cancel anytime
          </p>
        </section>

        <footer className="mt-12 flex items-center justify-between border-t border-border pt-5">
          <span className="font-display text-sm font-semibold">Glazo Forge</span>
          <span className="text-[11px] text-muted-foreground">Forge · Shape · Post</span>
        </footer>
      </div>
    </div>
  );
}
