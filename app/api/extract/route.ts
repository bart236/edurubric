import { NextResponse } from "next/server";
import { extractDocxText } from "@/lib/extract";

export const runtime = "nodejs";

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
    if (!name.endsWith(".docx")) {
      return NextResponse.json(
        { error: "Alleen .docx wordt in MVP ondersteund." },
        { status: 415 },
      );
    }
    const arrayBuffer = await file.arrayBuffer();
    const text = await extractDocxText(Buffer.from(arrayBuffer));
    if (text.length < 50) {
      return NextResponse.json(
        { error: "Geen leesbare tekst gevonden in het bestand." },
        { status: 422 },
      );
    }
    return NextResponse.json({ text, fileName: file.name });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
