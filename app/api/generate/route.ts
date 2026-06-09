import { NextResponse } from "next/server";
import JSZip from "jszip";
import { AnalyseSchema, ContextSchema } from "@/lib/schemas";
import {
  buildAnalyseDocx,
  buildDocentRubricDocx,
  buildFeedbackDocx,
} from "@/lib/docx-builder";

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

    const allowed = ["analyse", "docent", "leerling", "bundle"] as const;
    type Which = (typeof allowed)[number];
    const which: Which = (allowed as readonly string[]).includes(body.which)
      ? (body.which as Which)
      : "bundle";

    const base = `${safeName(ctx.vak)}_${safeName(ctx.onderwerp)}`;
    const docxHeaders = (filename: string) => ({
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    });

    if (which === "analyse") {
      const buf = await buildAnalyseDocx(ctx, analyse, toetsNaam);
      return new Response(new Uint8Array(buf), {
        status: 200,
        headers: docxHeaders(`${base}_sectie-analyse.docx`),
      });
    }
    if (which === "docent") {
      const buf = await buildDocentRubricDocx(ctx, analyse, toetsNaam);
      return new Response(new Uint8Array(buf), {
        status: 200,
        headers: docxHeaders(`${base}_docent-rubric.docx`),
      });
    }
    if (which === "leerling") {
      const buf = await buildFeedbackDocx(ctx, analyse, toetsNaam);
      return new Response(new Uint8Array(buf), {
        status: 200,
        headers: docxHeaders(`${base}_leerling-analyse.docx`),
      });
    }

    const [analyseBuf, docentBuf, leerlingBuf] = await Promise.all([
      buildAnalyseDocx(ctx, analyse, toetsNaam),
      buildDocentRubricDocx(ctx, analyse, toetsNaam),
      buildFeedbackDocx(ctx, analyse, toetsNaam),
    ]);
    const zip = new JSZip();
    zip.file(`${base}_sectie-analyse.docx`, analyseBuf);
    zip.file(`${base}_docent-rubric.docx`, docentBuf);
    zip.file(`${base}_leerling-analyse.docx`, leerlingBuf);
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
