"use client";

import { useMemo } from "react";
import type { Leerdoel, MappingItem } from "@/lib/schemas";

type Props = {
  mapping: MappingItem[];
  leerdoelen: Leerdoel[];
  onChange: (next: MappingItem[]) => void;
};

export function MappingTable({ mapping, leerdoelen, onChange }: Props) {
  const totals = useMemo(() => {
    const byCode: Record<string, number> = {};
    let total = 0;
    for (const m of mapping) {
      for (const code of m.leerdoelCodes) {
        byCode[code] = (byCode[code] || 0) + m.punten / m.leerdoelCodes.length;
      }
      total += m.punten;
    }
    return { byCode, total };
  }, [mapping]);

  const update = (i: number, patch: Partial<MappingItem>) => {
    const next = mapping.map((m, idx) => (idx === i ? { ...m, ...patch } : m));
    onChange(next);
  };
  const remove = (i: number) => onChange(mapping.filter((_, idx) => idx !== i));
  const add = () =>
    onChange([
      ...mapping,
      {
        vraag: "",
        omschrijving: "",
        leerdoelCodes: [leerdoelen[0]?.code ?? "LD1"],
        punten: 1,
      },
    ]);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-[color:var(--border)] bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-[color:var(--border)]">
            <tr>
              <th className="text-left px-3 py-2 font-semibold w-20">Vraag</th>
              <th className="text-left px-3 py-2 font-semibold">Wat wordt gevraagd</th>
              <th className="text-left px-3 py-2 font-semibold w-44">Leerdoel</th>
              <th className="text-left px-3 py-2 font-semibold w-44">2e leerdoel</th>
              <th className="text-left px-3 py-2 font-semibold w-20">Punten</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {mapping.map((m, i) => (
              <tr key={i} className="border-t border-[color:var(--border)]">
                <td className="px-3 py-2">
                  <input
                    className="input"
                    value={m.vraag}
                    onChange={(e) => update(i, { vraag: e.target.value })}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="input"
                    value={m.omschrijving}
                    onChange={(e) => update(i, { omschrijving: e.target.value })}
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    className="select"
                    value={m.leerdoelCodes[0] ?? ""}
                    onChange={(e) => {
                      const first = e.target.value;
                      const rest = m.leerdoelCodes.slice(1);
                      update(i, { leerdoelCodes: [first, ...rest].filter(Boolean) });
                    }}
                  >
                    {leerdoelen.map((ld) => (
                      <option key={ld.code} value={ld.code}>
                        {ld.code} — {ld.titel}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select
                    className="select"
                    value={m.leerdoelCodes[1] ?? ""}
                    onChange={(e) => {
                      const second = e.target.value;
                      const first = m.leerdoelCodes[0] ?? leerdoelen[0]?.code ?? "LD1";
                      update(i, {
                        leerdoelCodes: second ? [first, second] : [first],
                      });
                    }}
                  >
                    <option value="">— geen —</option>
                    {leerdoelen.map((ld) => (
                      <option key={ld.code} value={ld.code}>
                        {ld.code} — {ld.titel}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    className="input"
                    value={m.punten}
                    onChange={(e) =>
                      update(i, { punten: parseFloat(e.target.value) || 0 })
                    }
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    className="btn btn-ghost text-red-600 text-sm px-2"
                    onClick={() => remove(i)}
                    title="Verwijder"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button type="button" className="btn btn-secondary" onClick={add}>
        + Vraag toevoegen
      </button>

      <div>
        <h4 className="font-semibold text-sm mb-2">Gewicht per leerdoel</h4>
        <div className="space-y-1">
          {leerdoelen.map((ld) => {
            const pts = totals.byCode[ld.code] || 0;
            const pct = totals.total > 0 ? (pts / totals.total) * 100 : 0;
            return (
              <div key={ld.code} className="flex items-center gap-3 text-sm">
                <div className="w-28 font-medium">
                  <span className="text-[color:var(--pcc-blauw)]">{ld.code}</span>
                  <span className="text-[color:var(--muted)]"> — {ld.titel}</span>
                </div>
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[color:var(--pcc-blauw)]"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                <div className="w-24 text-right tabular-nums text-[color:var(--muted)]">
                  {pts.toFixed(1)} pt · {pct.toFixed(0)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
