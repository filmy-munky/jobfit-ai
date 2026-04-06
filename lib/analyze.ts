/**
 * The core scoring pipeline:
 * 1. Split the resume into sentences and embed them.
 * 2. Extract requirements from the JD and embed each one.
 * 3. For each requirement, find the max-similarity resume sentence.
 * 4. Bucket requirements into strong / weak / missing by similarity thresholds.
 * 5. Compute an overall fit score as the mean similarity weighted toward strong
 *    coverage, plus a penalty for missing requirements.
 */
import { cosineSim, embedBatch } from "./embeddings";
import { extractRequirements } from "./extract";
import { splitSentences } from "./sentences";

export type Coverage = "strong" | "weak" | "missing";

export interface RequirementMatch {
  requirement: string;
  bestSentence: string | null;
  score: number;
  coverage: Coverage;
}

export interface AnalysisResult {
  score: number;
  strengths: RequirementMatch[];
  weaknesses: RequirementMatch[];
  missing: RequirementMatch[];
  requirements: RequirementMatch[];
}

const STRONG_THRESHOLD = 0.55;
const WEAK_THRESHOLD = 0.35;

export async function analyze(resume: string, jd: string): Promise<AnalysisResult> {
  const resumeSentences = splitSentences(resume);
  const requirements = extractRequirements(jd);

  if (resumeSentences.length === 0 || requirements.length === 0) {
    return {
      score: 0,
      strengths: [],
      weaknesses: [],
      missing: requirements.map((r) => ({
        requirement: r,
        bestSentence: null,
        score: 0,
        coverage: "missing" as const,
      })),
      requirements: [],
    };
  }

  const [resumeVecs, reqVecs] = await Promise.all([
    embedBatch(resumeSentences),
    embedBatch(requirements),
  ]);

  const matches: RequirementMatch[] = requirements.map((req, i) => {
    let bestScore = -1;
    let bestIdx = -1;
    for (let j = 0; j < resumeVecs.length; j++) {
      const s = cosineSim(reqVecs[i], resumeVecs[j]);
      if (s > bestScore) {
        bestScore = s;
        bestIdx = j;
      }
    }
    const coverage: Coverage =
      bestScore >= STRONG_THRESHOLD
        ? "strong"
        : bestScore >= WEAK_THRESHOLD
        ? "weak"
        : "missing";
    return {
      requirement: req,
      bestSentence: bestIdx >= 0 ? resumeSentences[bestIdx] : null,
      score: bestScore,
      coverage,
    };
  });

  const strengths = matches.filter((m) => m.coverage === "strong");
  const weaknesses = matches.filter((m) => m.coverage === "weak");
  const missing = matches.filter((m) => m.coverage === "missing");

  // Overall score: weighted average penalizing missing items.
  const total = matches.length;
  const weighted =
    (strengths.length * 1.0 + weaknesses.length * 0.5 + missing.length * 0.0) / total;
  const score = Math.round(weighted * 100);

  return {
    score,
    strengths,
    weaknesses,
    missing,
    requirements: matches,
  };
}
