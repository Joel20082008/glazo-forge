import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface AdminStats {
  allowed: boolean;
  users: number;
  activeUsers: number;
  generations: number;
  generationsThisMonth: number;
  projects: number;
  savedItems: number;
  plans: Record<string, number>;
  topTools: { tool: string; count: number }[];
}

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminStats> => {
    const empty: AdminStats = {
      allowed: false,
      users: 0,
      activeUsers: 0,
      generations: 0,
      generationsThisMonth: 0,
      projects: 0,
      savedItems: 0,
      plans: {},
      topTools: [],
    };

    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) return empty;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [profiles, generations, monthGenerations, projects, saved, recentGen] =
      await Promise.all([
        supabaseAdmin.from("profiles").select("plan"),
        supabaseAdmin.from("generations").select("id", { count: "exact", head: true }),
        supabaseAdmin
          .from("generations")
          .select("id", { count: "exact", head: true })
          .gte("created_at", monthStart.toISOString()),
        supabaseAdmin.from("projects").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("saved_items").select("id", { count: "exact", head: true }),
        supabaseAdmin
          .from("generations")
          .select("user_id, tool")
          .gte("created_at", thirtyDaysAgo),
      ]);

    const plans: Record<string, number> = {};
    for (const row of profiles.data ?? []) {
      const plan = row.plan ?? "free";
      plans[plan] = (plans[plan] ?? 0) + 1;
    }

    const toolCounts = new Map<string, number>();
    const activeIds = new Set<string>();
    for (const row of recentGen.data ?? []) {
      activeIds.add(row.user_id);
      toolCounts.set(row.tool, (toolCounts.get(row.tool) ?? 0) + 1);
    }

    return {
      allowed: true,
      users: profiles.data?.length ?? 0,
      activeUsers: activeIds.size,
      generations: generations.count ?? 0,
      generationsThisMonth: monthGenerations.count ?? 0,
      projects: projects.count ?? 0,
      savedItems: saved.count ?? 0,
      plans,
      topTools: [...toolCounts.entries()]
        .map(([tool, count]) => ({ tool, count }))
        .sort((a, b) => b.count - a.count),
    };
  });
