import { NextResponse } from "next/server";
import { ContextSchema } from "@/lib/schemas";
import { analyseToets } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ctxParse = ContextSchema.safeParse(body.context);
    if (!ctxParse.success) {
      return NextResponse.json(
        { error: "Context onvolledig: " + ctxParse.error.message },
        { status: 400 },
      );
    }
    const text: string = body.text;
    if (!text || typeof text !== "string" || text.length < 50) {
      return NextResponse.json(
        { error: "Toetstekst ontbreekt of is te kort." },
        { status: 400 },
      );
    }
    const analyse = await analyseToets(ctxParse.data, text);
    return NextResponse.json({ analyse });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
