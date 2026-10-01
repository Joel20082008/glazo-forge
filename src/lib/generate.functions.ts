import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PLAN_LIMITS, TOOLS, type ToolId } from "./tools";

const inputSchema = z.object({
  tool: z.enum([
    "hook",
    "script",
    "caption",
    "hashtag",
    "ideas",
    "repurpose",
    "improve",
  ]),
  input: z.string().min(3).max(8000),
  tone: z.string().max(60).optional(),
  platform: z.string().max(60).optional(),
  audience: z.string().max(200).optional(),
  style: z.string().max(60).optional(),
});

export type GenerateResult =
  | { status: "ok"; blocks: string[]; raw: string; usedThisMonth: number }
  | { status: "needs_configuration"; message: string }
  | { status: "limit_reached"; message: string }
  | { status: "error"; message: string };

function splitBlocks(raw: string): string[] {
  return raw
    .split(/^\s*-{3,}\s*$/m)
    .map((part) => part.trim())
    .filter(Boolean);
}

export const generateContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }): Promise<GenerateResult> => {
    const { supabase, userId } = context;
    const tool = TOOLS[data.tool as ToolId];

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", userId)
      .maybeSingle();
    const plan = profile?.plan ?? "free";
    const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS["free"]!;

    const periodStart = new Date();
    periodStart.setUTCDate(1);
    periodStart.setUTCHours(0, 0, 0, 0);

    const { count } = await supabase
      .from("generations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", periodStart.toISOString());
    const used = count ?? 0;

    if (used >= limits.generations) {
      return {
        status: "limit_reached",
        message: `You've used all ${limits.generations} generations on the ${limits.label} plan this month.`,
      };
    }

    const { runAiText, AiConfigurationError, AiGatewayError } = await import("./ai.server");

    const details = [
      data.platform ? `Platform: ${data.platform}` : null,
      data.tone ? `Tone: ${data.tone}` : null,
      data.style ? `Script style: ${data.style}` : null,
      data.audience ? `Audience: ${data.audience}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const raw = await runAiText([
        { role: "system", content: tool.system },
        {
          role: "user",
          content: `${details ? `${details}\n\n` : ""}Input:\n${data.input}`,
        },
      ]);

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("generations").insert({ user_id: userId, tool: data.tool });

      return { status: "ok", blocks: splitBlocks(raw), raw, usedThisMonth: used + 1 };
    } catch (error) {
      if (error instanceof AiConfigurationError) {
        return { status: "needs_configuration", message: error.message };
      }
      if (error instanceof AiGatewayError) {
        return { status: "error", message: error.message };
      }
      console.error("generateContent failed", error);
      return { status: "error", message: "Generation failed. Please try again." };
    }
  });

export const aiStatus = createServerFn({ method: "GET" }).handler(async () => ({
  configured: Boolean(process.env["LOVABLE_API_KEY"]),
}));
