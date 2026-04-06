import { NextRequest, NextResponse } from "next/server";
import { analyze } from "@/lib/analyze";
import { getProvider } from "@/lib/providers";
import { validateResume } from "@/lib/validate-resume";

export const runtime = "nodejs";
export const maxDuration = 60;

const NARRATIVE_SYSTEM = `You are a candid career coach. Given a fit analysis between
a resume and a job description, write a 3-paragraph narrative: (1) what the candidate
does well for this role, (2) where the gaps are, (3) concrete next steps to close the
strongest gaps. Be specific. Do not fabricate experience the resume does not claim.`;

export async function POST(req: NextRequest) {
  const { resume, jd, skipValidation } = await req.json();
  if (typeof resume !== "string" || typeof jd !== "string" || !resume.trim() || !jd.trim()) {
    return NextResponse.json({ error: "resume and jd are required" }, { status: 400 });
  }

  // Validate resume unless this is a re-validation of an AI-rewritten resume
  if (!skipValidation) {
    const validation = validateResume(resume);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.reason }, { status: 422 });
    }
  }

  const result = await analyze(resume, jd);

  // Narrative from the provider (offline-safe via MockProvider).
  const provider = getProvider();
  const userMsg =
    `Fit score: ${result.score}/100\n\n` +
    `Strong coverage:\n${result.strengths.map((s) => `- ${s.requirement}`).join("\n") || "(none)"}\n\n` +
    `Weak coverage:\n${result.weaknesses.map((s) => `- ${s.requirement}`).join("\n") || "(none)"}\n\n` +
    `Missing:\n${result.missing.map((s) => `- ${s.requirement}`).join("\n") || "(none)"}`;

  let narrative = "";
  try {
    narrative = await provider.complete(NARRATIVE_SYSTEM, userMsg);
  } catch (e) {
    narrative = `(Narrative unavailable: ${(e as Error).message})`;
  }

  return NextResponse.json({ ...result, narrative });
}
