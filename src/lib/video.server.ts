/**
 * Video provider boundary (Lovable AI Gateway, /v1/videos). Server-only.
 * Swapping providers only requires changing this file.
 */
const GATEWAY_BASE_URL = "https://ai.gateway.lovable.dev";
export const VIDEO_MODEL = "google/gemini-omni-1.1-flash";

export type VideoJob = {
  id: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  progress?: number;
  error?: { code: string; message: string };
};

export class VideoConfigurationError extends Error {}
export class VideoGatewayError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function apiKey() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new VideoConfigurationError("Video provider is not configured.");
  return key;
}

function headers(json = false) {
  const key = apiKey();
  return {
    Authorization: `Bearer ${key}`,
    "Lovable-API-Key": key,
    "X-Lovable-AIG-SDK": "fetch",
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

async function jobResponse(response: Response): Promise<VideoJob> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { message?: string; error?: { message?: string } }
      | null;
    const message = body?.message ?? body?.error?.message ?? `Video request failed (${response.status})`;
    if (response.status === 401) throw new VideoConfigurationError("Video provider credentials are invalid.");
    if (response.status === 402) throw new VideoGatewayError("AI credits are exhausted for this workspace.", 402);
    if (response.status === 429) throw new VideoGatewayError("The video service is busy. Try again shortly.", 429);
    throw new VideoGatewayError(message, response.status);
  }
  return (await response.json()) as VideoJob;
}

export async function createVideoJob(opts: {
  prompt: string;
  aspectRatio: "16:9" | "9:16";
  durationSeconds: number;
  image?: { data: string; mimeType: string };
}): Promise<VideoJob> {
  const input = opts.image
    ? [
        { type: "image", data: opts.image.data, mime_type: opts.image.mimeType },
        { type: "text", text: `Animate this image <FIRST_FRAME>. ${opts.prompt}` },
      ]
    : opts.prompt;
  return jobResponse(
    await fetch(`${GATEWAY_BASE_URL}/v1/videos`, {
      method: "POST",
      headers: headers(true),
      body: JSON.stringify({
        model: VIDEO_MODEL,
        input,
        response_format: {
          type: "video",
          resolution: "720p",
          duration: `${opts.durationSeconds}s`,
          aspect_ratio: opts.aspectRatio,
        },
      }),
    }),
  );
}

export async function pollVideoJob(id: string): Promise<VideoJob> {
  return jobResponse(
    await fetch(`${GATEWAY_BASE_URL}/v1/videos/${encodeURIComponent(id)}`, { headers: headers() }),
  );
}

export async function downloadVideo(id: string): Promise<ArrayBuffer> {
  const response = await fetch(`${GATEWAY_BASE_URL}/v1/videos/${encodeURIComponent(id)}/content`, {
    headers: headers(),
  });
  if (!response.ok) throw new VideoGatewayError(`Video download failed (${response.status})`, response.status);
  return response.arrayBuffer();
}
