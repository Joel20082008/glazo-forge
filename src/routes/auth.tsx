import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BrandMark } from "@/components/brand-mark";
import { GlowBackdrop } from "@/components/glow-backdrop";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Glazo Forge" },
      { name: "description", content: "Sign in or create your Glazo Forge account." },
      { property: "og:title", content: "Sign in — Glazo Forge" },
      { property: "og:description", content: "Sign in or create your Glazo Forge account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setNotice("Check your inbox for a password reset link.");
        return;
      }
      if (mode === "signup") {
        if (password.length < 8) {
          toast.error("Use at least 8 characters for your password.");
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setNotice("Account created. Confirm your email address to sign in.");
          return;
        }
        navigate({ to: "/dashboard", replace: true });
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Google sign-in failed. Try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <GlowBackdrop />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pt-6 pb-12">
        <BrandMark />
        <div className="glass animate-rise mt-10 rounded-2xl p-5">
          <h1 className="font-display text-2xl font-bold">
            {mode === "signin"
              ? "Welcome back"
              : mode === "signup"
                ? "Create your account"
                : "Reset your password"}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {mode === "forgot"
              ? "We'll email you a secure link to set a new password."
              : "Forge ideas into content that gets attention."}
          </p>

          <form onSubmit={onSubmit} className="mt-5 space-y-3">
            {mode === "signup" ? (
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name"
                autoComplete="name"
                className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-accent/60"
              />
            ) : null}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              autoComplete="email"
              className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-accent/60"
            />
            {mode !== "forgot" ? (
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-accent/60"
              />
            ) : null}
            <button
              type="submit"
              disabled={busy}
              className="font-display w-full rounded-xl bg-accent py-3 text-sm font-bold text-accent-foreground disabled:opacity-60"
            >
              {busy
                ? "Working…"
                : mode === "signin"
                  ? "Sign in"
                  : mode === "signup"
                    ? "Create account"
                    : "Send reset link"}
            </button>
          </form>

          {notice ? (
            <p className="mt-3 rounded-xl border border-accent/30 bg-accent/10 p-3 text-[12px] text-accent">
              {notice}
            </p>
          ) : null}

          {mode !== "forgot" ? (
            <>
              <div className="my-4 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
              </div>
              <button
                onClick={onGoogle}
                disabled={busy}
                className="w-full rounded-xl border border-border bg-foreground/5 py-3 text-sm font-medium disabled:opacity-60"
              >
                Continue with Google
              </button>
            </>
          ) : null}

          <div className="mt-5 flex flex-wrap justify-between gap-2 text-[12px] text-muted-foreground">
            {mode === "signin" ? (
              <>
                <button onClick={() => setMode("signup")} className="hover:text-foreground">
                  Create an account
                </button>
                <button onClick={() => setMode("forgot")} className="hover:text-foreground">
                  Forgot password?
                </button>
              </>
            ) : (
              <button onClick={() => setMode("signin")} className="hover:text-foreground">
                Back to sign in
              </button>
            )}
          </div>
        </div>

        <Link to="/" className="mt-6 text-center text-[12px] text-muted-foreground">
          Back to home
        </Link>
      </div>
    </div>
  );
}
