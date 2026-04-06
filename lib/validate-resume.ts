/**
 * Lightweight heuristic to detect whether text looks like a resume.
 *
 * Checks for signals commonly found in resumes: section headers, dates,
 * contact info patterns, bullet points with action verbs, skill keywords.
 * Returns { valid, reason } — reason is a user-facing message when invalid.
 */

const RESUME_HEADERS = [
  /\b(experience|work\s*history|employment|professional\s*experience)\b/i,
  /\b(education|academic|qualification|degree)\b/i,
  /\b(skills|technical\s*skills|core\s*competencies|expertise)\b/i,
  /\b(summary|profile|objective|about\s*me)\b/i,
  /\b(certifications?|licenses?|awards?|honors?)\b/i,
  /\b(projects?|portfolio|publications?)\b/i,
  /\b(languages?|interests?|volunteer|references?)\b/i,
];

const DATE_PATTERNS = [
  /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}\b/i,
  /\b\d{4}\s*[-–—]\s*(present|\d{4})\b/i,
  /\b(20\d{2}|19\d{2})\b/,
];

const CONTACT_PATTERNS = [
  /[\w.-]+@[\w.-]+\.\w{2,}/,           // email
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/, // phone
  /\b(linkedin|github)\.com\b/i,        // profile links
];

const ACTION_VERBS = [
  "led", "managed", "built", "developed", "designed", "implemented",
  "created", "delivered", "improved", "launched", "reduced", "increased",
  "achieved", "collaborated", "analyzed", "optimized", "mentored",
  "architected", "deployed", "established", "maintained", "coordinated",
  "spearheaded", "streamlined", "engineered", "researched",
];

interface ValidationResult {
  valid: boolean;
  reason: string;
}

export function validateResume(text: string): ValidationResult {
  if (!text || text.trim().length < 50) {
    return {
      valid: false,
      reason: "This doesn't look like a resume — it's too short. Please paste or upload your full resume so I can help you out.",
    };
  }

  const lower = text.toLowerCase();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

  let score = 0;
  const signals: string[] = [];

  // Check resume section headers (strong signal)
  const headerMatches = RESUME_HEADERS.filter((r) => r.test(text));
  if (headerMatches.length >= 2) {
    score += 3;
    signals.push("section headers");
  } else if (headerMatches.length === 1) {
    score += 1;
  }

  // Check dates (employment history)
  const dateMatches = DATE_PATTERNS.filter((r) => r.test(text));
  if (dateMatches.length >= 1) {
    score += 2;
    signals.push("dates");
  }

  // Contact info
  const contactMatches = CONTACT_PATTERNS.filter((r) => r.test(text));
  if (contactMatches.length >= 1) {
    score += 2;
    signals.push("contact info");
  }

  // Action verbs (bullet-point experience)
  const verbCount = ACTION_VERBS.filter((v) => lower.includes(v)).length;
  if (verbCount >= 4) {
    score += 3;
    signals.push("action verbs");
  } else if (verbCount >= 2) {
    score += 1;
  }

  // Bullet points
  const bulletLines = lines.filter((l) => /^\s*[-•*▪·]\s/.test(l));
  if (bulletLines.length >= 3) {
    score += 1;
    signals.push("bullet points");
  }

  // Has enough content (a real resume is usually 200+ words)
  const wordCount = text.split(/\s+/).length;
  if (wordCount >= 80) {
    score += 1;
  }

  // Threshold: need at least 4 points to consider it a resume
  if (score >= 4) {
    return { valid: true, reason: "" };
  }

  return {
    valid: false,
    reason:
      "This doesn't feel like a resume. I couldn't find typical resume elements like section headers (Experience, Education, Skills), dates, or professional bullet points. Please upload or paste a legitimate resume so I can help you out.",
  };
}
