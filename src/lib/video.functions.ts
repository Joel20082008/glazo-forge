import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PLAN_LIMITS } from "./tools";

export const VIDEO_ASPECTS = ["9:16", "16:9", "1:1"] as const;
/** Aspect ratios the connected provider can actually produce. */
export const SUPPORTED_VIDEO_ASPECTS = ["9:16", "16:9"] as const;
export const VIDEO_DURATIONS = [4, 6, 8, 10] as const;

function monthStart() {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

const startSchema = z.object({
  prompt: z.string().trim().min(5).max(2000),
  aspectRatio: z.enum(SUPPORTED_VIDEO_ASPECTS),
  durationSeconds: z.union([z.literal(4), z.literal(6), z.literal(8), z.literal(10)]),
  image: z
    .object({
      data: z.string().min(10).max(11_000_000),
      mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
    })
    .optional(),
});

export type StartVideoResult =
  | { status: "ok"; id: string }
  | { status: "needs_configuration"; message: string }
  | { status: "limit_reached"; message: string }
  | { status: "error"; message: string };

export const startVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => startSchema.parse(data))
  .handler(async ({ data, context }): Promise<StartVideoResult> => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("plan").eq("id", userId).maybeSingle();
    const limits = PLAN_LIMITS[profile?.plan ?? "free"] ?? PLAN_LIMITS["free"]!;

    const { count } = await supabase
      .from("video_generations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .neq("status", "failed")
      .gte("created_at", monthStart());
    if ((count ?? 0) >= limits.videos) {
      return {
        status: "limit_reached",
        message: `You've used all ${limits.videos} AI videos on the ${limits.label} plan this month.`,
      };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createVideoJob, VideoConfigurationError, VideoGatewayError } = await import("./video.server");

    const { data: row, error: insertError } = await supabaseAdmin
      .from("video_generations")
      .insert({
        user_id: userId,
        prompt: data.prompt,
        aspect_ratio: data.aspectRatio,
        duration_seconds: data.durationSeconds,
        has_image: Boolean(data.image),
      })
      .select("id")
      .single();
    if (insertError || !row) return { status: "error", message: "Could not start the video." };

    try {
      const job = await createVideoJob(data);
      await supabaseAdmin
        .from("video_generations")
        .update({ job_id: job.id, status: job.status, progress: job.progress ?? null, updated_at: new Date().toISOString() })
        .eq("id", row.id);
      return { status: "ok", id: row.id };
    } catch (error) {
      const message =
        error instanceof VideoConfigurationError || error instanceof VideoGatewayError
          ? error.message
          : "The video service could not start this video.";
      if (!(error instanceof VideoConfigurationError || error instanceof VideoGatewayError)) {
        console.error("startVideo failed", error);
      }
      await supabaseAdmin
        .from("video_generations")
        .update({ status: "failed", error: message, updated_at: new Date().toISOString() })
        .eq("id", row.id);
      if (error instanceof VideoConfigurationError) return { status: "needs_configuration", message };
      return { status: "error", message };
    }
  });

export type VideoRow = {
  id: string;
  prompt: string;
  aspect_ratio: string;
  duration_seconds: number;
  has_image: boolean;
  status: string;
  progress: number | null;
  error: string | null;
  created_at: string;
  url: string | null;
  downloadUrl: string | null;
};

async function signed(path: string | null) {
  if (!path) return { url: null, downloadUrl: null };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [view, dl] = await Promise.all([
    supabaseAdmin.storage.from("videos").createSignedUrl(path, 3600),
    supabaseAdmin.storage.from("videos").createSignedUrl(path, 3600, { download: "glazo-forge-video.mp4" }),
  ]);
  return { url: view.data?.signedUrl ?? null, downloadUrl: dl.data?.signedUrl ?? null };
}

/** Refreshes one video's status from the provider; stores the MP4 once complete. */
export const checkVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<VideoRow | null> => {
    // RLS: the user can only read their own rows.
    const { data: row } = await context.supabase
      .from("video_generations")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) return null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let current = row;
    if ((row.status === "queued" || row.status === "in_progress" || (row.status === "completed" && !row.storage_path)) && row.job_id) {
      const { pollVideoJob, downloadVideo } = await import("./video.server");
      try {
        const job = await pollVideoJob(row.job_id);
        const patch: Record<string, unknown> = {
          status: job.status,
          progress: job.progress ?? null,
          updated_at: new Date().toISOString(),
        };
        if (job.status === "failed") {
          patch["error"] =
            job.error?.message ??
            (row.has_image ? "Generation failed. The uploaded image may be the cause." : "Generation failed.");
        }
        if (job.status === "completed" && !row.storage_path) {
          const path = `${row.user_id}/${row.id}.mp4`;
          const bytes = await downloadVideo(row.job_id);
          const { error: uploadError } = await supabaseAdmin.storage
            .from("videos")
            .upload(path, bytes, { contentType: "video/mp4", upsert: true });
          if (uploadError) throw uploadError;
          patch["storage_path"] = path;
        }
        const { data: updated } = await supabaseAdmin
          .from("video_generations")
          .update(patch)
          .eq("id", row.id)
          .select("*")
          .single();
        if (updated) current = updated;
      } catch (error) {
        console.error("checkVideo poll failed", error);
      }
    }
    const urls = await signed(current.storage_path);
    return { ...current, ...urls };
  });

export const listVideos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<VideoRow[]> => {
    const { data } = await context.supabase
      .from("video_generations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    return Promise.all(
      (data ?? []).map(async (row) => ({ ...row, ...(await signed(row.storage_path)) })),
    );
  });

export type UsageSummary = {
  plan: string;
  planLabel: string;
  subscriptionStatus: string;
  generations: { used: number; limit: number };
  videos: { used: number; limit: number };
  projects: { used: number; limit: number };
  videoConfigured: boolean;
};

export const getUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UsageSummary> => {
    const { supabase, userId } = context;
    const since = monthStart();
    const [profile, gens, vids, projects] = await Promise.all([
      supabase.from("profiles").select("plan, subscription_status").eq("id", userId).maybeSingle(),
      supabase.from("generations").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", since),
      supabase
        .from("video_generations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .neq("status", "failed")
        .gte("created_at", since),
      supabase.from("projects").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);
    const plan = profile.data?.plan ?? "free";
    const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS["free"]!;
    return {
      plan,
      planLabel: limits.label,
      subscriptionStatus: profile.data?.subscription_status ?? "inactive",
      generations: { used: gens.count ?? 0, limit: limits.generations },
      videos: { used: vids.count ?? 0, limit: limits.videos },
      projects: { used: projects.count ?? 0, limit: limits.projects },
      videoConfigured: Boolean(process.env["LOVABLE_API_KEY"]),
    };
  });
