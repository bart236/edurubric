import { NextResponse } from "next/server";
import { extractTextFromFile } from "@/lib/extract";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Geen bestand ontvangen onder veld 'file'." },
        { status: 400 },
      );
    }
    const name = file.name.toLowerCase();
    if (!name.endsWith(".docx") && !name.endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Alleen .docx of .pdf wordt ondersteund." },
        { status: 415 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `Bestand is te groot (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.` },
        { status: 413 },
      );
    }
    const arrayBuffer = await file.arrayBuffer();
    const text = await extractTextFromFile(Buffer.from(arrayBuffer), file.name);
    if (text.length < 50) {
      return NextResponse.json(
        {
          error:
            "Geen leesbare tekst gevonden. Bij een gescande PDF is OCR nodig — gebruik een doorzoekbare PDF of de .docx.",
        },
        { status: 422 },
      );
    }
    return NextResponse.json({ text, fileName: file.name });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
