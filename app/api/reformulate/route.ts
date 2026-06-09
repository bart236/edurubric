import { NextResponse } from "next/server";
import { reformuleerLeerdoel } from "@/lib/gemini";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const huidig: string = body.huidig;
    const niveau: string = body.niveau ?? "TL";
    if (!huidig || typeof huidig !== "string") {
      return NextResponse.json(
        { error: "Veld 'huidig' ontbreekt." },
        { status: 400 },
      );
    }
    const nieuw = await reformuleerLeerdoel(huidig, niveau);
    return NextResponse.json({ leerlingtaal: nieuw });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
