import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";

import { createLovableAiGatewayRunIdFetch } from "./ai-run-id";

const GATEWAY_BASE_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

export class AiConfigurationError extends Error {}
export class AiGatewayError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/**
 * Single AI service boundary. Swapping providers only requires changing this file.
 */
export async function runAiText(messages: ModelMessage[]): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    throw new AiConfigurationError("AI provider is not configured.");
  }

  const runIdFetch = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: GATEWAY_BASE_URL,
    apiKey,
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    fetch: runIdFetch.fetch,
  });

  let streamError: unknown = null;
  try {
    const result = streamText({
      model: provider.responses(MODEL),
      messages,
      onError: ({ error }) => {
        streamError = error;
        console.error("AI stream error", error);
      },
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    const text = await result.text;
    if (streamError) throw streamError;
    return text;
  } catch (caught) {
    const error = streamError ?? caught;
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number((error as { statusCode: unknown }).statusCode)
        : 500;
    if (status === 402) {
      throw new AiGatewayError("AI credits are exhausted for this workspace.", 402);
    }
    if (status === 429) {
      throw new AiGatewayError("Too many requests right now. Try again shortly.", 429);
    }
    if (status === 401) {
      throw new AiConfigurationError("AI provider credentials are invalid.");
    }
    throw new AiGatewayError(
      error instanceof Error ? error.message : "The AI provider could not complete this request.",
      status,
    );
  }
}
