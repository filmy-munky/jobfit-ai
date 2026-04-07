import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_EXTENSIONS = new Set([
  ".pdf", ".docx", ".txt", ".md", ".mdx", ".rst",
  ".csv", ".json", ".xml", ".yaml", ".yml", ".toml", ".rtf",
]);

export async function POST(req: NextRequest) {
  // CSRF check: reject requests without the custom header
  if (req.headers.get("x-requested-with") !== "XMLHttpRequest") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // File size limit
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 10 MB." },
      { status: 413 },
    );
  }

  const name = file.name.toLowerCase();
  const ext = "." + (name.split(".").pop() ?? "");

  // Server-side file type allowlist
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json(
      { error: "Unsupported file type. Accepted: .pdf, .docx, .txt, .md, .csv, .json, .yaml, .rtf" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let text = "";

  try {
    if (ext === ".pdf") {
      const mod = await import("pdf-parse");
      const parse = typeof mod === "function" ? mod : (mod as any).default ?? mod;
      const data = await parse(buffer);
      text = data.text ?? "";
    } else if (ext === ".docx") {
      const mammoth = await import("mammoth");
      const extractFn =
        typeof mammoth.extractRawText === "function"
          ? mammoth.extractRawText
          : (mammoth as any).default?.extractRawText;
      if (!extractFn) throw new Error("module load failure");
      const result = await extractFn({ buffer });
      text = result.value ?? "";
    } else {
      text = buffer.toString("utf-8");
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to parse file. Please try a different format." },
      { status: 422 },
    );
  }

  text = text.trim();
  if (!text) {
    return NextResponse.json(
      { error: "The file appears to be empty or could not be read." },
      { status: 422 },
    );
  }

  return NextResponse.json({ text });
}
