"use client";

import { useCallback, useState } from "react";

type Props = {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
};

export function UploadZone({ file, onChange, disabled }: Props) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      const f = e.dataTransfer.files?.[0];
      if (f) onChange(f);
    },
    [onChange, disabled],
  );

  return (
    <label
      htmlFor="file-input"
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`block cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
        dragOver
          ? "border-[color:var(--pcc-blauw)] bg-[color:var(--pcc-blauw-licht)]"
          : "border-[color:var(--border)] bg-white hover:bg-slate-50"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <input
        id="file-input"
        type="file"
        accept=".docx"
        disabled={disabled}
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {file ? (
        <div className="space-y-2">
          <div className="text-2xl">📄</div>
          <div className="font-medium text-[color:var(--foreground)]">{file.name}</div>
          <div className="text-sm text-[color:var(--muted)]">
            {(file.size / 1024).toFixed(0)} kB · klik om te wisselen
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-3xl">⬆️</div>
          <div className="font-medium">Sleep een toets-docx hierheen</div>
          <div className="text-sm text-[color:var(--muted)]">
            of klik om te selecteren · alleen .docx · alléén blanco toetsen, geen leerlingdata
          </div>
        </div>
      )}
    </label>
  );
}
