import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { BrandMark } from "@/components/brand-mark";
import { GlowBackdrop } from "@/components/glow-backdrop";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password — Glazo Forge" },
      { name: "description", content: "Choose a new password for your Glazo Forge account." },
      { property: "og:title", content: "Set a new password — Glazo Forge" },
      {
        property: "og:description",
        content: "Choose a new password for your Glazo Forge account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      toast.error("Use at least 8 characters.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated.");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <GlowBackdrop />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pt-6">
        <BrandMark />
        <form onSubmit={onSubmit} className="glass animate-rise mt-10 rounded-2xl p-5">
          <h1 className="font-display text-2xl font-bold">Set a new password</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Open this page from the link in your reset email.
          </p>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            autoComplete="new-password"
            className="mt-5 w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-accent/60"
          />
          <button
            type="submit"
            disabled={busy}
            className="font-display mt-3 w-full rounded-xl bg-accent py-3 text-sm font-bold text-accent-foreground disabled:opacity-60"
          >
            {busy ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
