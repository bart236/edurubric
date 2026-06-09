"use client";

import { useState } from "react";
import type { Leerdoel } from "@/lib/schemas";

type Props = {
  leerdoelen: Leerdoel[];
  onChange: (next: Leerdoel[]) => void;
  niveau: string;
};

function nextCode(existing: Leerdoel[]): string {
  const used = new Set(existing.map((l) => l.code));
  for (let i = 1; i <= 9; i++) {
    const c = `LD${i}`;
    if (!used.has(c)) return c;
  }
  return `LD${existing.length + 1}`;
}

export function LeerdoelenEditor({ leerdoelen, onChange, niveau }: Props) {
  const [busyIdx, setBusyIdx] = useState<number | null>(null);

  const update = (i: number, patch: Partial<Leerdoel>) => {
    const next = leerdoelen.map((l, idx) => (idx === i ? { ...l, ...patch } : l));
    onChange(next);
  };
  const remove = (i: number) => onChange(leerdoelen.filter((_, idx) => idx !== i));
  const add = () =>
    onChange([
      ...leerdoelen,
      {
        code: nextCode(leerdoelen),
        titel: "Nieuw leerdoel",
        leerlingtaal: "Ik kan ...",
      },
    ]);

  const reformuleer = async (i: number) => {
    setBusyIdx(i);
    try {
      const res = await fetch("/api/reformulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ huidig: leerdoelen[i].leerlingtaal, niveau }),
      });
      const data = await res.json();
      if (res.ok && data.leerlingtaal) {
        update(i, { leerlingtaal: data.leerlingtaal });
      }
    } finally {
      setBusyIdx(null);
    }
  };

  return (
    <div className="space-y-3">
      {leerdoelen.map((ld, i) => (
        <div
          key={i}
          className="rounded-lg border border-[color:var(--border)] bg-white p-4 space-y-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="input max-w-[100px] font-semibold text-[color:var(--pcc-blauw)]"
              value={ld.code}
              onChange={(e) => update(i, { code: e.target.value.toUpperCase() })}
            />
            <input
              className="input flex-1 min-w-[200px]"
              value={ld.titel}
              maxLength={50}
              onChange={(e) => update(i, { titel: e.target.value })}
              placeholder="Korte titel"
            />
            <button
              type="button"
              className="btn btn-ghost text-sm"
              onClick={() => reformuleer(i)}
              disabled={busyIdx === i}
              title="Herformuleer in leerlingtaal (Gemini Flash)"
            >
              {busyIdx === i ? "..." : "↻ Herformuleer"}
            </button>
            <button
              type="button"
              className="btn btn-ghost text-sm text-red-600 hover:text-red-700"
              onClick={() => remove(i)}
            >
              ✕
            </button>
          </div>
          <textarea
            className="textarea"
            rows={2}
            value={ld.leerlingtaal}
            maxLength={200}
            onChange={(e) => update(i, { leerlingtaal: e.target.value })}
            placeholder="Ik kan ..."
          />
        </div>
      ))}
      {leerdoelen.length < 9 && (
        <button type="button" className="btn btn-secondary" onClick={add}>
          + Leerdoel toevoegen
        </button>
      )}
    </div>
  );
}
