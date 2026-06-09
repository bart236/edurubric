"use client";

import type { Drempel, Leerdoel } from "@/lib/schemas";

type Props = {
  drempels: Drempel[];
  leerdoelen: Leerdoel[];
  onChange: (next: Drempel[]) => void;
};

function defaultDrempel(code: string): Drempel {
  return { leerdoelCode: code, behaaldVanafProcent: 75, nogNietTotProcent: 40 };
}

export function DrempelEditor({ drempels, leerdoelen, onChange }: Props) {
  // Zorg dat elk leerdoel een drempel-entry heeft
  const byCode = new Map(drempels.map((d) => [d.leerdoelCode, d]));
  const ensured: Drempel[] = leerdoelen.map(
    (ld) => byCode.get(ld.code) ?? defaultDrempel(ld.code),
  );

  // Als ensured anders is dan props, sync stilletjes
  if (ensured.length !== drempels.length) {
    setTimeout(() => onChange(ensured), 0);
  }

  const update = (code: string, patch: Partial<Drempel>) => {
    const next = ensured.map((d) =>
      d.leerdoelCode === code ? { ...d, ...patch } : d,
    );
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {leerdoelen.map((ld) => {
        const d = byCode.get(ld.code) ?? defaultDrempel(ld.code);
        return (
          <div
            key={ld.code}
            className="rounded-lg border border-[color:var(--border)] bg-white p-4"
          >
            <div className="flex flex-wrap items-baseline gap-2 mb-3">
              <span className="font-semibold text-[color:var(--pcc-blauw)]">
                {ld.code}
              </span>
              <span className="text-sm text-[color:var(--muted)]">— {ld.titel}</span>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="rounded border border-red-200 bg-red-50 p-2 text-center">
                <div className="text-xs text-red-700 font-medium">Nog niet</div>
                <div className="text-lg font-semibold tabular-nums">
                  &lt; {d.nogNietTotProcent}%
                </div>
              </div>
              <div className="rounded border border-amber-200 bg-amber-50 p-2 text-center">
                <div className="text-xs text-amber-800 font-medium">Op weg</div>
                <div className="text-lg font-semibold tabular-nums">
                  {d.nogNietTotProcent}–{d.behaaldVanafProcent - 1}%
                </div>
              </div>
              <div className="rounded border border-emerald-200 bg-emerald-50 p-2 text-center">
                <div className="text-xs text-emerald-700 font-medium">Behaald</div>
                <div className="text-lg font-semibold tabular-nums">
                  ≥ {d.behaaldVanafProcent}%
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-2">
              <div>
                <label className="label text-xs">Nog niet tot (%)</label>
                <input
                  type="number"
                  min={10}
                  max={50}
                  className="input"
                  value={d.nogNietTotProcent}
                  onChange={(e) =>
                    update(ld.code, {
                      nogNietTotProcent: clamp(parseInt(e.target.value) || 0, 10, 50),
                    })
                  }
                />
              </div>
              <div>
                <label className="label text-xs">Behaald vanaf (%)</label>
                <input
                  type="number"
                  min={50}
                  max={95}
                  className="input"
                  value={d.behaaldVanafProcent}
                  onChange={(e) =>
                    update(ld.code, {
                      behaaldVanafProcent: clamp(
                        parseInt(e.target.value) || 0,
                        50,
                        95,
                      ),
                    })
                  }
                />
              </div>
            </div>
            <input
              className="input text-sm"
              placeholder="Optionele toelichting (bv. 'vraag 4c moet correct zijn voor Behaald')"
              value={d.toelichting ?? ""}
              onChange={(e) =>
                update(ld.code, { toelichting: e.target.value || undefined })
              }
            />
          </div>
        );
      })}
    </div>
  );
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}
