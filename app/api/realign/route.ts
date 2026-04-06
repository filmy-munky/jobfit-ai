import { NextRequest } from "next/server";
import { getProvider } from "@/lib/providers";

export const runtime = "nodejs";
export const maxDuration = 120;

const SYSTEM = `You are an expert resume writer. Given a resume and an analysis of gaps
against a job description, rewrite the ENTIRE resume so it better targets the role.

Rules:
- Keep all factual claims identical — never invent experience, titles, companies, or numbers
- Reword bullets to use the JD's language and emphasize relevant impact
- Add a "Summary" section at the top tailored to the JD
- For skills that are weakly covered, surface them more prominently
- For missing skills, suggest where the candidate could add relevant context IF they have it —
  but DO NOT fabricate experience
- Use strong action verbs, quantify impact where possible
- Output the complete rewritten resume in clean plain text, ready to copy
- Use clear section headers (SUMMARY, EXPERIENCE, SKILLS, EDUCATION, etc.)
- Each bullet should start with "- "`;

export async function POST(req: NextRequest) {
  const { resume, jd, analysis } = await req.json();
  if (!resume || !jd) {
    return new Response("resume and jd required", { status: 400 });
  }

  const provider = getProvider();
  const user = `ORIGINAL RESUME:
${resume}

JOB DESCRIPTION:
${jd}

ANALYSIS:
Score: ${analysis.score}/100
Strong matches: ${analysis.strengths?.map((s: { requirement: string }) => s.requirement).join("; ") || "none"}
Weak coverage: ${analysis.weaknesses?.map((s: { requirement: string }) => s.requirement).join("; ") || "none"}
Missing: ${analysis.missing?.map((s: { requirement: string }) => s.requirement).join("; ") || "none"}

Rewrite the entire resume to better target this role. Keep all facts truthful.`;

  if (provider.stream) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const delta of provider.stream!(SYSTEM, user)) {
            controller.enqueue(encoder.encode(delta));
          }
        } catch (e) {
          controller.enqueue(
            encoder.encode(`\n\n[Error: ${(e as Error).message}]`),
          );
        } finally {
          controller.close();
        }
      },
    });
    return new Response(stream, {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const text = await provider.complete(SYSTEM, user);
  return new Response(text, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
