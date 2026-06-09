"use client";

import { useState } from "react";
import { UploadZone } from "@/components/UploadZone";
import { ContextForm } from "@/components/ContextForm";
import { LeerdoelenEditor } from "@/components/LeerdoelenEditor";
import { MappingTable } from "@/components/MappingTable";
import { DrempelEditor } from "@/components/DrempelEditor";
import type { Analyse, Context } from "@/lib/schemas";

type Phase = "input" | "analyzing" | "results";

const initialContext: Context = {
  vak: "",
  leerjaar: "1",
  niveau: "TL",
  onderwerp: "",
};

export default function Home() {
  const [phase, setPhase] = useState<Phase>("input");
  const [file, setFile] = useState<File | null>(null);
  const [ctx, setCtx] = useState<Context>(initialContext);
  const [error, setError] = useState<string | null>(null);
  const [analyse, setAnalyse] = useState<Analyse | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const canAnalyze =
    !!file && ctx.vak.trim() && ctx.onderwerp.trim() && ctx.leerjaar && ctx.niveau;

  const startAnalyze = async () => {
    if (!file) return;
    setError(null);
    setPhase("analyzing");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const extractRes = await fetch("/api/extract", { method: "POST", body: fd });
      const extractData = await extractRes.json();
      if (!extractRes.ok) throw new Error(extractData.error || "Tekstextractie mislukt");

      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: extractData.text, context: ctx }),
      });
      const analyzeData = await analyzeRes.json();
      if (!analyzeRes.ok) throw new Error(analyzeData.error || "Analyse mislukt");

      setAnalyse(analyzeData.analyse);
      setPhase("results");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Onbekende fout";
      setError(msg);
      setPhase("input");
    }
  };

  const reset = () => {
    setPhase("input");
    setFile(null);
    setCtx(initialContext);
    setAnalyse(null);
    setError(null);
  };

  const download = async (which: "analyse" | "feedback" | "bundle") => {
    if (!analyse) return;
    setDownloading(which);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: ctx, analyse, which, toetsNaam: ctx.toetsNaam }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Download mislukt (${res.status})`);
      }
      const blob = await res.blob();
      const disp = res.headers.get("Content-Disposition") || "";
      const m = /filename="([^"]+)"/.exec(disp);
      const name =
        m?.[1] ??
        (which === "bundle" ? "EduRubric.zip" : `EduRubric_${which}.docx`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Onbekende fout";
      setError(msg);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <main className="min-h-screen">
      <header className="border-b border-[color:var(--border)] bg-white">
        <div className="mx-auto max-w-5xl px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[color:var(--pcc-blauw)] text-white grid place-items-center font-bold">
              ER
            </div>
            <div>
              <div className="font-semibold leading-tight">EduRubric</div>
              <div className="text-xs text-[color:var(--muted)]">
                Toets → leerdoelen → feedback-pagina
              </div>
            </div>
          </div>
          {phase === "results" && (
            <button className="btn btn-ghost text-sm" onClick={reset}>
              ↺ Nieuwe toets
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <strong>Fout:</strong> {error}
          </div>
        )}

        {phase === "input" && (
          <>
            <section className="card space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Upload je toets</h2>
                <p className="text-sm text-[color:var(--muted)] mt-1">
                  Word-bestand (.docx) — zonder leerlingnamen of antwoorden.
                </p>
              </div>
              <UploadZone file={file} onChange={setFile} />
            </section>

            <section className="card space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Context</h2>
                <p className="text-sm text-[color:var(--muted)] mt-1">
                  Helpt Gemini om leerdoelen op het juiste niveau te formuleren.
                </p>
              </div>
              <ContextForm value={ctx} onChange={setCtx} />
            </section>

            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-[color:var(--muted)] max-w-xl">
                <strong>AVG:</strong> alleen de toetstekst en bovenstaande context
                worden naar Gemini gestuurd. Geen leerlingdata. Niets wordt opgeslagen
                — bij refresh is alles weg.
              </p>
              <button
                className="btn btn-primary"
                disabled={!canAnalyze}
                onClick={startAnalyze}
              >
                Analyseer →
              </button>
            </div>
          </>
        )}

        {phase === "analyzing" && (
          <div className="card text-center py-16 space-y-4">
            <div className="inline-block w-10 h-10 border-4 border-[color:var(--pcc-blauw)] border-t-transparent rounded-full animate-spin" />
            <div className="font-medium">Toets wordt geanalyseerd…</div>
            <div className="text-sm text-[color:var(--muted)]">
              Tekstextractie → leerdoelen → mapping → drempels. ~10–15 seconden.
            </div>
          </div>
        )}

        {phase === "results" && analyse && (
          <>
            <section className="card space-y-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <h2 className="text-xl font-semibold">A. Leerdoelen</h2>
                  <p className="text-sm text-[color:var(--muted)] mt-1">
                    {analyse.leerdoelen.length} stuks · in leerlingtaal · pas aan,
                    herformuleer of voeg toe.
                  </p>
                </div>
              </div>
              <LeerdoelenEditor
                leerdoelen={analyse.leerdoelen}
                niveau={ctx.niveau}
                onChange={(leerdoelen) => setAnalyse({ ...analyse, leerdoelen })}
              />
            </section>

            <section className="card space-y-4">
              <div>
                <h2 className="text-xl font-semibold">B. Mapping vraag → leerdoel</h2>
                <p className="text-sm text-[color:var(--muted)] mt-1">
                  Verschuif vragen naar het juiste leerdoel. Maximaal 2 leerdoelen per vraag.
                </p>
              </div>
              <MappingTable
                mapping={analyse.mapping}
                leerdoelen={analyse.leerdoelen}
                onChange={(mapping) => setAnalyse({ ...analyse, mapping })}
              />
            </section>

            <section className="card space-y-4">
              <div>
                <h2 className="text-xl font-semibold">C. Drempels per leerdoel</h2>
                <p className="text-sm text-[color:var(--muted)] mt-1">
                  Default: Behaald ≥ 75%, Nog niet &lt; 40%. Pas aan waar dat past.
                </p>
              </div>
              <DrempelEditor
                drempels={analyse.drempels}
                leerdoelen={analyse.leerdoelen}
                onChange={(drempels) => setAnalyse({ ...analyse, drempels })}
              />
            </section>

            <section className="card space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Observatie</h2>
                <p className="text-sm text-[color:var(--muted)] mt-1">
                  Gemini&apos;s korte observatie over de balans van deze toets.
                </p>
              </div>
              <textarea
                className="textarea"
                rows={3}
                value={analyse.observatie}
                onChange={(e) =>
                  setAnalyse({ ...analyse, observatie: e.target.value })
                }
              />
            </section>

            <section className="card space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Download</h2>
                <p className="text-sm text-[color:var(--muted)] mt-1">
                  Twee aparte .docx-bestanden — voor sectie-overleg én voor achter de toets.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  className="btn btn-primary"
                  onClick={() => download("bundle")}
                  disabled={!!downloading}
                >
                  {downloading === "bundle" ? "..." : "↓ Beide (zip)"}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => download("analyse")}
                  disabled={!!downloading}
                >
                  {downloading === "analyse" ? "..." : "↓ Analyse-document"}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => download("feedback")}
                  disabled={!!downloading}
                >
                  {downloading === "feedback" ? "..." : "↓ Feedback-pagina"}
                </button>
                <div className="ml-auto">
                  <button className="btn btn-ghost" onClick={reset}>
                    ↺ Nieuwe toets
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      <footer className="border-t border-[color:var(--border)] bg-white mt-12">
        <div className="mx-auto max-w-5xl px-6 py-4 text-xs text-[color:var(--muted)] flex justify-between">
          <span>EduRubric · MVP v0.1 · PCC Heiloo</span>
          <span>Word-first · Geen opslag · Geen leerlingdata</span>
        </div>
      </footer>
    </main>
  );
}
