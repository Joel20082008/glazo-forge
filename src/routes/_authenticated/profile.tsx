import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { PLAN_LIMITS } from "@/lib/tools";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — ViralForge" },
      { name: "description", content: "Manage your ViralForge profile, plan and password." },
      { property: "og:title", content: "Profile — ViralForge" },
      {
        property: "og:description",
        content: "Manage your ViralForge profile, plan and password.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Profile,
});

function Profile() {
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState("");
  const [niche, setNiche] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("No session");
      const { data } = await supabase
        .from("profiles")
        .select("display_name, niche, plan")
        .eq("id", auth.user.id)
        .maybeSingle();
      return { email: auth.user.email ?? "", ...data };
    },
  });

  const adminQuery = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", auth.user.id)
        .eq("role", "admin")
        .maybeSingle();
      return Boolean(data);
    },
  });
  const isAdmin = adminQuery.data ?? false;

  useEffect(() => {
    if (profile.data) {
      setDisplayName(profile.data.display_name ?? "");
      setNiche(profile.data.niche ?? "");
    }
  }, [profile.data]);

  async function saveProfile() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: auth.user.id, display_name: displayName, niche });
    if (error) toast.error("Could not save profile.");
    else {
      toast.success("Profile saved");
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
    }
  }

  async function changePassword() {
    if (newPassword.length < 8) {
      toast.error("Use at least 8 characters.");
      return;
    }
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      ...(currentPassword ? { current_password: currentPassword } : {}),
    } as Parameters<typeof supabase.auth.updateUser>[0]);
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated");
      setCurrentPassword("");
      setNewPassword("");
    }
  }

  const plan = profile.data?.plan ?? "free";
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS["free"]!;

  return (
    <AppShell plan={limits.label}>
      <section className="mt-8 animate-rise">
        <h1 className="font-display text-2xl font-bold">Profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">{profile.data?.email}</p>
      </section>

      <section className="glass mt-5 rounded-2xl p-4">
        <label className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
          Display name
        </label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="mt-2 w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-accent/60"
        />
        <label className="mt-4 block text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
          Your niche
        </label>
        <input
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          placeholder="e.g. Fitness coaching for busy parents"
          className="mt-2 w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-accent/60"
        />
        <button
          onClick={saveProfile}
          className="font-display mt-4 rounded-lg bg-accent px-4 py-2 text-[13px] font-bold text-accent-foreground"
        >
          Save profile
        </button>
      </section>

      <section className="glass mt-4 rounded-2xl p-4">
        <h2 className="font-display text-sm font-semibold">Subscription</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          You're on the {limits.label} plan — {limits.generations} generations and{" "}
          {limits.projects} projects per month.
        </p>
        <p className="mt-3 rounded-xl border border-accent/30 bg-accent/10 p-3 text-[12px] text-accent">
          REQUIRES CONFIGURATION — no payment provider is connected, so plan upgrades are not
          available yet.
        </p>
      </section>

      {isAdmin ? (
        <Link
          to="/admin"
          className="glass mt-4 flex items-center justify-between rounded-2xl p-4 text-sm font-medium"
        >
          Admin dashboard
          <span className="text-muted-foreground">→</span>
        </Link>
      ) : null}

      <section className="glass mt-4 rounded-2xl p-4">
        <h2 className="font-display text-sm font-semibold">Change password</h2>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Current password"
          autoComplete="current-password"
          className="mt-3 w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-accent/60"
        />
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New password"
          autoComplete="new-password"
          className="mt-2 w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-accent/60"
        />
        <button
          onClick={changePassword}
          className="mt-3 rounded-lg border border-border bg-foreground/10 px-4 py-2 text-[13px] font-medium"
        >
          Update password
        </button>
      </section>
    </AppShell>
  );
}
