import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const TEXT_EXTENSIONS = new Set([
  ".txt", ".md", ".mdx", ".rst", ".csv", ".json", ".xml",
  ".html", ".htm", ".yaml", ".yml", ".toml", ".ini", ".cfg",
  ".log", ".rtf",
]);

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  const ext = "." + (name.split(".").pop() ?? "");
  let text = "";

  try {
    if (ext === ".pdf") {
      // pdf-parse
      const mod = await import("pdf-parse");
      const parse = typeof mod === "function" ? mod : (mod as any).default ?? mod;
      const data = await parse(buffer);
      text = data.text ?? "";
    } else if (ext === ".docx") {
      // mammoth
      const mammoth = await import("mammoth");
      const extractFn =
        typeof mammoth.extractRawText === "function"
          ? mammoth.extractRawText
          : (mammoth as any).default?.extractRawText;
      if (!extractFn) throw new Error("mammoth module could not be loaded");
      const result = await extractFn({ buffer });
      text = result.value ?? "";
    } else if (TEXT_EXTENSIONS.has(ext)) {
      text = buffer.toString("utf-8");
    } else {
      // Try reading as UTF-8 text anyway — covers any text-based format
      const candidate = buffer.toString("utf-8");
      // Check if it's actually text (no null bytes in first 8KB)
      const sample = candidate.slice(0, 8192);
      if (sample.includes("\0")) {
        return NextResponse.json(
          { error: `Unsupported binary format: ${ext}. Please use .pdf, .docx, .txt, .md, .csv, .json, or any text file.` },
          { status: 400 },
        );
      }
      text = candidate;
    }
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to parse file: ${(e as Error).message}` },
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
