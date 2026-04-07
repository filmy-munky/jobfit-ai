import { NextRequest, NextResponse } from "next/server";
import { analyze } from "@/lib/analyze";
import { getProvider } from "@/lib/providers";
import { validateResume } from "@/lib/validate-resume";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_INPUT_LENGTH = 50_000; // ~12,500 words

const NARRATIVE_SYSTEM = `You are a candid career coach. Given a fit analysis between
a resume and a job description, write a 3-paragraph narrative: (1) what the candidate
does well for this role, (2) where the gaps are, (3) concrete next steps to close the
strongest gaps. Be specific. Do not fabricate experience the resume does not claim.`;

export async function POST(req: NextRequest) {
  // Rate limit: 20 requests per minute per IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = rateLimit(ip, "analyze", 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${Math.ceil(rl.retryAfterMs / 1000)}s.` },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { resume, jd } = body as { resume?: string; jd?: string };
  if (typeof resume !== "string" || typeof jd !== "string" || !resume.trim() || !jd.trim()) {
    return NextResponse.json({ error: "resume and jd are required" }, { status: 400 });
  }

  // Input length limits
  if (resume.length > MAX_INPUT_LENGTH || jd.length > MAX_INPUT_LENGTH) {
    return NextResponse.json(
      { error: `Input too long. Maximum ${MAX_INPUT_LENGTH} characters.` },
      { status: 400 },
    );
  }

  // Always validate resume (no public bypass)
  const validation = validateResume(resume);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.reason }, { status: 422 });
  }

  const result = await analyze(resume, jd);

  const provider = getProvider();
  const userMsg =
    `<analysis>\nFit score: ${result.score}/100\n\n` +
    `Strong coverage:\n${result.strengths.map((s) => `- ${s.requirement}`).join("\n") || "(none)"}\n\n` +
    `Weak coverage:\n${result.weaknesses.map((s) => `- ${s.requirement}`).join("\n") || "(none)"}\n\n` +
    `Missing:\n${result.missing.map((s) => `- ${s.requirement}`).join("\n") || "(none)"}\n</analysis>`;

  let narrative = "";
  try {
    narrative = await provider.complete(NARRATIVE_SYSTEM, userMsg);
  } catch {
    narrative = "Analysis narrative is temporarily unavailable.";
  }

  return NextResponse.json({ ...result, narrative });
}
