"use client";

import type { Context, Niveau } from "@/lib/schemas";

const NIVEAUS: Niveau[] = ["KB", "TL", "H", "V", "KB/TL", "TL/H", "H/V"];

const VAKKEN = [
  "Nederlands",
  "Engels",
  "Frans",
  "Duits",
  "Spaans",
  "Wiskunde",
  "NaSk",
  "Natuurkunde",
  "Scheikunde",
  "Biologie",
  "Aardrijkskunde",
  "Geschiedenis",
  "Economie",
  "Mens & Maatschappij",
  "Kunst",
  "Muziek",
  "LO",
  "Levensbeschouwing",
  "Mentorles",
  "Techniek",
];

type Props = {
  value: Context;
  onChange: (next: Context) => void;
  disabled?: boolean;
};

export function ContextForm({ value, onChange, disabled }: Props) {
  const set = <K extends keyof Context>(k: K, v: Context[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="label" htmlFor="vak">
          Vak
        </label>
        <input
          id="vak"
          list="vak-list"
          className="input"
          value={value.vak}
          onChange={(e) => set("vak", e.target.value)}
          disabled={disabled}
          placeholder="bv. NaSk"
        />
        <datalist id="vak-list">
          {VAKKEN.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      </div>

      <div>
        <label className="label" htmlFor="leerjaar">
          Leerjaar
        </label>
        <select
          id="leerjaar"
          className="select"
          value={value.leerjaar}
          onChange={(e) => set("leerjaar", e.target.value)}
          disabled={disabled}
        >
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="niveau">
          Niveau
        </label>
        <select
          id="niveau"
          className="select"
          value={value.niveau}
          onChange={(e) => set("niveau", e.target.value as Niveau)}
          disabled={disabled}
        >
          {NIVEAUS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="onderwerp">
          Onderwerp / Hoofdstuk
        </label>
        <input
          id="onderwerp"
          className="input"
          value={value.onderwerp}
          maxLength={60}
          onChange={(e) => set("onderwerp", e.target.value)}
          disabled={disabled}
          placeholder="bv. H1 Deeltjesmodel"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="label" htmlFor="toetsnaam">
          Toets-naam <span className="text-[color:var(--muted)] font-normal">(optioneel — verschijnt in de header van beide docx-en)</span>
        </label>
        <input
          id="toetsnaam"
          className="input"
          value={value.toetsNaam ?? ""}
          maxLength={60}
          onChange={(e) => set("toetsNaam", e.target.value || undefined)}
          disabled={disabled}
          placeholder="bv. Toets H1 — schooljaar 25/26"
        />
      </div>
    </div>
  );
}
