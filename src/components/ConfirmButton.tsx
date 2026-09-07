"use client";

import { useEffect, useState } from "react";

type Props = {
  onConfirm: () => void | Promise<void>;
  label?: string;
  confirmLabel?: string;
  className?: string;
};

// Two-step "Delete → Confirm" control, no browser confirm() dialogs.
export default function ConfirmButton({
  onConfirm,
  label = "Delete",
  confirmLabel = "Confirm?",
  className = "",
}: Props) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className={`text-xs rounded-md border border-border px-2 py-1 text-ink-muted hover:text-red hover:border-red transition-colors ${className}`}
      >
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await onConfirm();
        } finally {
          setBusy(false);
          setArmed(false);
        }
      }}
      className={`text-xs rounded-md bg-red text-red-ink px-2 py-1 disabled:opacity-60 ${className}`}
    >
      {busy ? "…" : confirmLabel}
    </button>
  );
}
