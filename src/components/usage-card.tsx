import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { getUsage } from "@/lib/video.functions";

function Meter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = Math.min(100, limit ? (used / limit) * 100 : 0);
  const full = used >= limit;
  return (
    <div>
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-muted-foreground">{label}</span>
        <span className={full ? "font-semibold text-destructive" : "font-medium"}>
          {used.toLocaleString("en-NG")} / {limit.toLocaleString("en-NG")}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
        <div
          className={`h-full rounded-full ${full ? "bg-destructive" : "bg-accent"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function UsageCard() {
  const fetchUsage = useServerFn(getUsage);
  const { data } = useQuery({ queryKey: ["usage"], queryFn: () => fetchUsage() });

  return (
    <section className="glass mt-3 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-sm font-bold tracking-[0.12em] uppercase">
          {data?.planLabel ?? "…"}
        </span>
        {data?.plan !== "premium" && (
          <button
            type="button"
            onClick={() =>
              toast.info("Upgrade Plan", {
                description: "Payments require configuration — upgrades can't be purchased yet.",
              })
            }
            className="font-display rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[11px] font-semibold text-accent"
          >
            Upgrade Plan
          </button>
        )}
      </div>
      <div className="mt-3 space-y-3">
        <Meter label="AI Generations" used={data?.generations.used ?? 0} limit={data?.generations.limit ?? 0} />
        <Meter label="AI Videos" used={data?.videos.used ?? 0} limit={data?.videos.limit ?? 0} />
        <Meter label="Projects" used={data?.projects.used ?? 0} limit={data?.projects.limit ?? 0} />
      </div>
      <p className="mt-3 text-[10px] text-muted-foreground">Monthly usage resets on the 1st (UTC).</p>
    </section>
  );
}
