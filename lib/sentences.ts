/**
 * Simple sentence and line splitter. Resumes are mostly bullet points, not prose,
 * so we split on newlines and sentence terminators and keep every non-trivial unit.
 */
export function splitSentences(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\s•\-\*·●▪]+/, "").trim())
    .filter(Boolean);

  const out: string[] = [];
  for (const line of lines) {
    // Break long lines into sentences.
    const parts = line.split(/(?<=[.!?])\s+(?=[A-Z])/);
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.length >= 6) out.push(trimmed);
    }
  }
  return out;
}
