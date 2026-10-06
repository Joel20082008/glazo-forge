import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  checkVideo,
  getUsage,
  listVideos,
  startVideo,
  SUPPORTED_VIDEO_ASPECTS,
  VIDEO_ASPECTS,
  VIDEO_DURATIONS,
  type VideoRow,
} from "@/lib/video.functions";

export const Route = createFileRoute("/_authenticated/video")({
  head: () => ({
    meta: [
      { title: "AI Video Generator — Glazo Forge" },
      { name: "description", content: "Turn a text prompt or an image into a short AI video." },
      { property: "og:title", content: "AI Video Generator — Glazo Forge" },
      { property: "og:description", content: "Turn a text prompt or an image into a short AI video." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VideoPage,
});

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function Chip({ active, disabled, children, onClick }: { active: boolean; disabled?: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-40 ${
        active ? "border-accent/50 bg-accent/15 text-accent" : "border-border bg-foreground/5"
      }`}
    >
      {children}
    </button>
  );
}

function statusLabel(row: VideoRow) {
  if (row.status === "completed" && row.url) return "Ready";
  if (row.status === "completed") return "Saving…";
  if (row.status === "failed") return "Failed";
  if (row.status === "in_progress") return row.progress ? `Generating · ${row.progress}%` : "Generating…";
  return "Queued…";
}

function VideoPage() {
  const queryClient = useQueryClient();
  const start = useServerFn(startVideo);
  const check = useServerFn(checkVideo);
  const list = useServerFn(listVideos);
  const usageFn = useServerFn(getUsage);

  const [prompt, setPrompt] = useState("");
  const [aspect, setAspect] = useState<(typeof SUPPORTED_VIDEO_ASPECTS)[number]>("9:16");
  const [duration, setDuration] = useState<(typeof VIDEO_DURATIONS)[number]>(6);
  const [image, setImage] = useState<{ data: string; mimeType: "image/png" | "image/jpeg" | "image/webp"; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [active, setActive] = useState<VideoRow | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const usage = useQuery({ queryKey: ["usage"], queryFn: () => usageFn() });
  const history = useQuery({ queryKey: ["videos"], queryFn: () => list() });

  // Poll the active job every 8 seconds until it finishes.
  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      const row = await check({ data: { id: activeId } }).catch(() => null);
      if (cancelled) return;
      if (row) setActive(row);
      const done = row && (row.status === "failed" || (row.status === "completed" && row.url));
      if (done) {
        if (row.status === "failed") toast.error(row.error ?? "Video generation failed.");
        else toast.success("Your video is ready.");
        queryClient.invalidateQueries({ queryKey: ["videos"] });
        queryClient.invalidateQueries({ queryKey: ["usage"] });
        return;
      }
      timer = setTimeout(tick, 8000);
    };
    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeId, check, queryClient]);

  function onFile(file: File | undefined) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Use a PNG, JPEG or WebP image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image must be under 8 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      setImage({
        data: result.slice(result.indexOf(",") + 1),
        mimeType: file.type as "image/png" | "image/jpeg" | "image/webp",
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
  }

  async function onGenerate() {
    if (prompt.trim().length < 5) {
      toast.error("Describe your video in a few more words.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await start({
        data: {
          prompt: prompt.trim(),
          aspectRatio: aspect,
          durationSeconds: duration,
          ...(image ? { image: { data: image.data, mimeType: image.mimeType } } : {}),
        },
      });
      if (res.status === "ok") {
        setActive(null);
        setActiveId(res.id);
        toast.success("Video started — this usually takes 1–3 minutes.");
        queryClient.invalidateQueries({ queryKey: ["usage"] });
      } else if (res.status === "limit_reached") {
        toast.error("Video limit reached", {
          description: `${res.message} Upgrade options: payments require configuration.`,
        });
      } else {
        toast.error(res.message);
      }
      queryClient.invalidateQueries({ queryKey: ["videos"] });
    } catch {
      toast.error("Could not start the video.");
    } finally {
      setSubmitting(false);
    }
  }

  const u = usage.data;
  const atLimit = u ? u.videos.used >= u.videos.limit : false;
  const busy = Boolean(activeId && active?.status !== "failed" && !(active?.status === "completed" && active.url));

  return (
    <AppShell>
      <section className="mt-8 animate-rise">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-accent/15 text-accent">🎥</span>
          <h1 className="font-display text-2xl font-bold">AI Video Generator</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Turn a prompt — or a photo — into a short video clip with sound.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
          {u && !u.videoConfigured ? (
            <span className="rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 font-semibold text-destructive">
              REQUIRES CONFIGURATION
            </span>
          ) : null}
          {u && (
            <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-muted-foreground">
              {u.videos.used} / {u.videos.limit} videos this month · {u.planLabel}
            </span>
          )}
        </div>
      </section>

      <section className="glass mt-5 space-y-4 rounded-2xl p-4">
        <div>
          <label htmlFor="video-prompt" className="text-[12px] font-medium">
            Describe your video
          </label>
          <textarea
            id="video-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="e.g. Slow push-in on a steaming cup of coffee on a wooden table at sunrise, soft acoustic guitar"
            className="mt-1.5 w-full rounded-xl border border-border bg-foreground/5 p-3 text-sm outline-none focus:border-accent/50"
          />
        </div>

        <div>
          <p className="text-[12px] font-medium">Starting image (optional)</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              {image ? "Change image" : "Upload image"}
            </Button>
            {image && (
              <>
                <span className="max-w-[160px] truncate text-[12px] text-muted-foreground">{image.name}</span>
                <button type="button" className="text-[12px] text-muted-foreground underline" onClick={() => setImage(null)}>
                  Remove
                </button>
              </>
            )}
          </div>
        </div>

        <div>
          <p className="text-[12px] font-medium">Aspect ratio</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {VIDEO_ASPECTS.map((a) => {
              const supported = (SUPPORTED_VIDEO_ASPECTS as readonly string[]).includes(a);
              return (
                <Chip
                  key={a}
                  active={aspect === a}
                  disabled={!supported}
                  onClick={() => supported && setAspect(a as (typeof SUPPORTED_VIDEO_ASPECTS)[number])}
                >
                  {a}
                  {!supported && " · coming soon"}
                </Chip>
              );
            })}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">1:1 isn't supported by the current video provider yet.</p>
        </div>

        <div>
          <p className="text-[12px] font-medium">Duration</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {VIDEO_DURATIONS.map((d) => (
              <Chip key={d} active={duration === d} onClick={() => setDuration(d)}>
                {d}s
              </Chip>
            ))}
          </div>
        </div>

        <Button
          type="button"
          className="font-display w-full font-bold"
          disabled={submitting || busy || atLimit}
          onClick={onGenerate}
        >
          {submitting ? "Starting…" : busy ? "Generating…" : atLimit ? "Monthly video limit reached" : "Generate video"}
        </Button>
        {atLimit && (
          <p className="text-center text-[11px] text-muted-foreground">
            Upgrade for more videos — payments require configuration.
          </p>
        )}
        <p className="text-center text-[10px] text-muted-foreground">Each video uses 1 of your monthly AI videos. Failed videos don't count.</p>
      </section>

      {activeId && (
        <section className="glass mt-4 rounded-2xl p-4">
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-medium">Current video</span>
            <span className="text-muted-foreground">{active ? statusLabel(active) : "Checking…"}</span>
          </div>
          {active && !active.url && active.status !== "failed" && (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
              <div className="h-full animate-pulse rounded-full bg-accent" style={{ width: `${Math.max(8, active.progress ?? 15)}%` }} />
            </div>
          )}
          {active?.status === "failed" && <p className="mt-2 text-[12px] text-destructive">{active.error}</p>}
          {active?.url && <VideoPreview row={active} />}
        </section>
      )}

      <section className="mt-7">
        <h2 className="font-display mb-3 text-sm font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          History
        </h2>
        {history.data && history.data.length === 0 ? (
          <p className="glass rounded-2xl p-4 text-[12px] text-muted-foreground">No videos yet.</p>
        ) : (
          <div className="space-y-2">
            {(history.data ?? []).map((row) => (
              <div key={row.id} className="glass rounded-xl p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="line-clamp-2 min-w-0 flex-1 text-[13px]">{row.prompt}</p>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{statusLabel(row)}</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {row.aspect_ratio} · {row.duration_seconds}s{row.has_image ? " · from image" : ""} ·{" "}
                  {new Date(row.created_at).toLocaleDateString()}
                </p>
                {row.url ? (
                  <VideoPreview row={row} />
                ) : row.status !== "failed" && row.id !== activeId ? (
                  <button type="button" className="mt-2 text-[12px] text-accent" onClick={() => setActiveId(row.id)}>
                    Check progress
                  </button>
                ) : row.status === "failed" && row.error ? (
                  <p className="mt-1 text-[11px] text-destructive">{row.error}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function VideoPreview({ row }: { row: VideoRow }) {
  return (
    <div className="mt-3">
      <video
        src={row.url ?? undefined}
        controls
        playsInline
        className={`w-full rounded-xl bg-foreground/5 ${row.aspect_ratio === "9:16" ? "mx-auto max-h-[480px] max-w-[270px]" : ""}`}
      />
      {row.downloadUrl && (
        <a href={row.downloadUrl} className="mt-2 inline-flex text-[12px] font-medium text-accent">
          ⬇ Download MP4
        </a>
      )}
    </div>
  );
}
