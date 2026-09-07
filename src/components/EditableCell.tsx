"use client";

import { useState } from "react";

type Props = {
  value: number;
  onCommit: (next: number) => void | Promise<void>;
  format?: (n: number) => string;
  step?: string;
};

// Click a number to edit, commit on blur or Enter.
export default function EditableCell({ value, onCommit, format, step = "0.01" }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(String(value));
          setEditing(true);
        }}
        className="editable-cell w-full text-left font-mono px-1 py-0.5 rounded hover:bg-accent-soft"
      >
        {format ? format(value) : value}
      </button>
    );
  }

  function commit() {
    const n = parseFloat(draft);
    setEditing(false);
    if (!Number.isNaN(n) && n !== value) onCommit(n);
  }

  return (
    <div className="editable-cell">
      <input
        autoFocus
        type="number"
        step={step}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setEditing(false);
        }}
      />
    </div>
  );
}
