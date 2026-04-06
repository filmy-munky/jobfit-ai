import { NextRequest } from "next/server";
import { getProvider } from "@/lib/providers";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `You rewrite resume bullet points so they align with the target job
description's language and emphasize measurable impact. Keep the underlying facts
identical — do not invent numbers, titles, or experience. Output one bullet per line
starting with "- ".`;

export async function POST(req: NextRequest) {
  const { bullet, jd } = await req.json();
  if (typeof bullet !== "string" || typeof jd !== "string") {
    return new Response("bad request", { status: 400 });
  }
  const provider = getProvider();
  const user = `Job description:\n${jd}\n\nOriginal bullet:\n${bullet}\n\nRewrite this as 2 stronger variants.`;

  // Stream if the provider supports it; otherwise fall back to a one-shot response.
  if (provider.stream) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const delta of provider.stream!(SYSTEM, user)) {
            controller.enqueue(encoder.encode(delta));
          }
        } catch (e) {
          controller.enqueue(encoder.encode(`\n(error: ${(e as Error).message})`));
        } finally {
          controller.close();
        }
      },
    });
    return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8" } });
  }

  const text = await provider.complete(SYSTEM, user);
  return new Response(text, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
