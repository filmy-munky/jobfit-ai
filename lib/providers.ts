/**
 * LLM provider abstraction. Every provider exposes `complete(system, user)` and
 * optionally `stream(system, user)`. The factory picks one from the JOBFIT_PROVIDER
 * env var, defaulting to a deterministic mock that works offline.
 */

export interface LLMProvider {
  complete(system: string, user: string): Promise<string>;
  stream?(system: string, user: string): AsyncIterable<string>;
}

class MockProvider implements LLMProvider {
  async complete(_system: string, user: string): Promise<string> {
    // Detect intent from the system/user prompt content
    if (_system.includes("resume writer") || user.includes("ORIGINAL RESUME")) {
      return this._mockRealign(user);
    }
    if (user.includes("rewrite") || user.includes("Rewrite")) {
      return "- Rewritten bullet focusing on impact and measurable outcomes.\n- Rewritten bullet aligning with the JD's core language.";
    }
    return "Based on the match analysis, the candidate shows solid coverage of the core requirements. The main gaps are in areas where the resume does not explicitly mention relevant experience. Consider adding concrete examples and quantified achievements to strengthen weak areas. Focus on aligning your language with the job description's terminology.";
  }

  private _mockRealign(user: string): string {
    // Extract the original resume and restructure it properly.
    // Pull the resume text from between "ORIGINAL RESUME:" and "JOB DESCRIPTION:"
    const resumeMatch = user.match(/ORIGINAL RESUME:\n([\s\S]*?)(?=\nJOB DESCRIPTION:)/);
    const jdMatch = user.match(/JOB DESCRIPTION:\n([\s\S]*?)(?=\nANALYSIS:)/);
    const resume = resumeMatch?.[1]?.trim() ?? "";
    const jd = jdMatch?.[1]?.trim() ?? "";

    // Extract key terms from JD for weaving into the resume
    const jdWords = new Set(
      jd.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? []
    );

    // Parse resume lines
    const lines = resume.split("\n").map((l) => l.trim()).filter(Boolean);

    // Try to find a name (first non-empty line that's short and doesn't look like a header)
    const nameCandidate = lines.find(
      (l) => l.length < 60 && !/^(summary|experience|education|skills|objective)/i.test(l)
    ) ?? "CANDIDATE NAME";

    // Build a proper restructured resume
    const output = [
      nameCandidate.toUpperCase(),
      "",
      "SUMMARY",
      `Results-driven professional with a proven track record of delivering impactful solutions. ${
        lines.length > 3 ? lines.slice(0, 2).join(". ") + "." : "Experienced in building scalable systems and driving measurable outcomes."
      }`,
      "",
      "EXPERIENCE",
    ];

    // Re-format experience bullets with stronger verbs
    const experienceLines = lines.filter(
      (l) => l.startsWith("-") || l.startsWith("•") || l.startsWith("*") || /^(led|managed|built|developed|designed|created|implemented)/i.test(l)
    );

    if (experienceLines.length > 0) {
      for (const line of experienceLines) {
        const cleaned = line.replace(/^[-•*]\s*/, "").trim();
        output.push(`- ${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}`);
      }
    } else {
      // Fallback: restructure any content lines as bullets
      for (const line of lines.slice(1, Math.min(lines.length, 10))) {
        if (/^(summary|experience|education|skills|objective|profile)/i.test(line)) continue;
        output.push(`- ${line}`);
      }
    }

    output.push("");
    output.push("SKILLS");

    // Extract skill-like keywords
    const skillLines = lines.filter(
      (l) =>
        /\b(python|java|go|rust|typescript|javascript|react|node|aws|gcp|azure|docker|kubernetes|sql|postgresql|redis|kafka|spark|tensorflow|pytorch)\b/i.test(l)
    );
    if (skillLines.length > 0) {
      output.push(`- ${skillLines.join(", ").replace(/^[-•*]\s*/g, "")}`);
    } else {
      output.push("- Technical skills aligned with role requirements");
    }

    output.push("");
    output.push("EDUCATION");
    const eduLines = lines.filter(
      (l) => /\b(university|college|bachelor|master|degree|b\.s\.|m\.s\.|phd|mba)\b/i.test(l)
    );
    if (eduLines.length > 0) {
      for (const line of eduLines) {
        output.push(`- ${line.replace(/^[-•*]\s*/, "")}`);
      }
    } else {
      output.push("- Education details");
    }

    return output.join("\n");
  }

  async *stream(_system: string, user: string): AsyncIterable<string> {
    const text = await this.complete(_system, user);
    // Stream character-by-character for a smoother effect
    const words = text.split(" ");
    for (const word of words) {
      yield word + " ";
      await new Promise((r) => setTimeout(r, 20));
    }
  }
}

class AnthropicProvider implements LLMProvider {
  private model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
  private apiKey = process.env.ANTHROPIC_API_KEY || "";

  async complete(system: string, user: string): Promise<string> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) throw new Error("Anthropic request failed");
    const data = await res.json();
    return (data.content || [])
      .map((b: { text?: string }) => b.text || "")
      .join("");
  }

  async *stream(system: string, user: string): AsyncIterable<string> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        system,
        messages: [{ role: "user", content: user }],
        stream: true,
      }),
    });
    if (!res.ok || !res.body) throw new Error("Anthropic streaming failed");
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n\n")) !== -1) {
        const frame = buf.slice(0, i);
        buf = buf.slice(i + 2);
        for (const line of frame.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "content_block_delta") {
              const t = event.delta?.text;
              if (t) yield t;
            }
          } catch {}
        }
      }
    }
  }
}

class OpenAIProvider implements LLMProvider {
  private model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  private apiKey = process.env.OPENAI_API_KEY || "";

  async complete(system: string, user: string): Promise<string> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error("OpenAI request failed");
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  }
}

class OllamaProvider implements LLMProvider {
  private host: string;
  private model = process.env.OLLAMA_MODEL || "llama3.1";

  constructor() {
    const h = process.env.OLLAMA_HOST || "http://localhost:11434";
    // SSRF protection: only allow localhost
    try {
      const url = new URL(h);
      if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
        throw new Error("OLLAMA_HOST must point to localhost");
      }
    } catch (e) {
      if ((e as Error).message.includes("OLLAMA_HOST")) throw e;
      throw new Error("Invalid OLLAMA_HOST URL");
    }
    this.host = h;
  }

  async complete(system: string, user: string): Promise<string> {
    const res = await fetch(`${this.host}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        stream: false,
      }),
    });
    if (!res.ok) throw new Error("Ollama request failed");
    const data = await res.json();
    return data.message?.content ?? "";
  }
}

export function getProvider(): LLMProvider {
  const name = (process.env.JOBFIT_PROVIDER || "mock").toLowerCase();
  if (name === "anthropic") return new AnthropicProvider();
  if (name === "openai") return new OpenAIProvider();
  if (name === "ollama") return new OllamaProvider();
  return new MockProvider();
}
