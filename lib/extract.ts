/**
 * Extract atomic requirement statements from a job description.
 *
 * Approach: split into lines, keep lines that look like requirements (bullets, or
 * lines starting with action verbs or requirement keywords), and drop fluff. This is
 * deliberately simple; if an LLM provider is configured the caller can replace this
 * with a call to `providers.extractRequirements` for higher-fidelity output.
 */

const REQUIREMENT_HINTS = [
  /\b(experience|proficient|familiar|knowledge of|skilled|expertise|background)\b/i,
  /\b(years? of)\b/i,
  /\b(ability to|able to|must|should|required|preferred|nice to have)\b/i,
  /\b(degree|bachelor|master|phd)\b/i,
];

const ACTION_VERBS = [
  "build", "ship", "design", "architect", "lead", "own", "develop", "implement",
  "deploy", "operate", "maintain", "collaborate", "mentor", "drive", "deliver",
  "analyze", "optimize", "scale", "launch", "improve",
];

function looksLikeRequirement(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 12 || trimmed.length > 300) return false;
  if (/^(about us|who we are|benefits|we offer|our team|why join)/i.test(trimmed)) return false;
  if (REQUIREMENT_HINTS.some((r) => r.test(trimmed))) return true;
  const first = trimmed.split(/\s+/, 1)[0]?.toLowerCase() ?? "";
  if (ACTION_VERBS.includes(first)) return true;
  return /^[\-•\*]/.test(line);
}

export function extractRequirements(jd: string): string[] {
  const lines = jd
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\s•\-\*·●▪]+/, "").trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    if (!looksLikeRequirement(line)) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  // Fall back to all lines if the JD is oddly formatted and we found nothing.
  if (out.length === 0) {
    return lines.filter((l) => l.length >= 15 && l.length <= 300).slice(0, 30);
  }
  return out.slice(0, 40);
}
