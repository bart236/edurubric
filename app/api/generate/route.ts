import { NextResponse } from "next/server";
import JSZip from "jszip";
import { AnalyseSchema, ContextSchema } from "@/lib/schemas";
import { buildAnalyseDocx, buildFeedbackDocx } from "@/lib/docx-builder";

export const runtime = "nodejs";
export const maxDuration = 30;

function safeName(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[^\w\s.-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 60) || "toets";
}

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
    const analyseParse = AnalyseSchema.safeParse(body.analyse);
    if (!analyseParse.success) {
      return NextResponse.json(
        { error: "Analyse onvolledig: " + analyseParse.error.message },
        { status: 400 },
      );
    }
    const ctx = ctxParse.data;
    const analyse = analyseParse.data;
    const toetsNaam: string | undefined = body.toetsNaam || ctx.toetsNaam;

    const which: "analyse" | "feedback" | "bundle" =
      body.which === "analyse" || body.which === "feedback"
        ? body.which
        : "bundle";

    const base = `${safeName(ctx.vak)}_${safeName(ctx.onderwerp)}`;

    if (which === "analyse") {
      const buf = await buildAnalyseDocx(ctx, analyse, toetsNaam);
      return new Response(new Uint8Array(buf), {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${base}_analyse.docx"`,
        },
      });
    }
    if (which === "feedback") {
      const buf = await buildFeedbackDocx(ctx, analyse, toetsNaam);
      return new Response(new Uint8Array(buf), {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${base}_feedback.docx"`,
        },
      });
    }

    const [analyseBuf, feedbackBuf] = await Promise.all([
      buildAnalyseDocx(ctx, analyse, toetsNaam),
      buildFeedbackDocx(ctx, analyse, toetsNaam),
    ]);
    const zip = new JSZip();
    zip.file(`${base}_analyse.docx`, analyseBuf);
    zip.file(`${base}_feedback.docx`, feedbackBuf);
    const zipBuf = await zip.generateAsync({ type: "nodebuffer" });
    return new Response(new Uint8Array(zipBuf), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${base}_EduRubric.zip"`,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
