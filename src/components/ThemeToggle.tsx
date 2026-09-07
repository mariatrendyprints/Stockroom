"use client";

import { useEffect, useState } from "react";

type ThemePref = "system" | "light" | "dark";

export default function ThemeToggle() {
  const [pref, setPref] = useState<ThemePref>("system");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("stockroom-theme") as ThemePref | null;
      if (stored) setPref(stored);
    } catch {
      // ignore
    }
  }, []);

  function apply(next: ThemePref) {
    setPref(next);
    try {
      if (next === "system") localStorage.removeItem("stockroom-theme");
      else localStorage.setItem("stockroom-theme", next);
    } catch {
      // ignore
    }
    if (next === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", next);
  }

  function cycle() {
    const order: ThemePref[] = ["system", "light", "dark"];
    apply(order[(order.indexOf(pref) + 1) % order.length]);
  }

  const label = pref === "system" ? "Auto" : pref === "light" ? "Light" : "Dark";

  return (
    <button
      onClick={cycle}
      title="Toggle theme"
      className="text-xs rounded-md border border-border px-2.5 py-1.5 text-ink-muted hover:text-ink hover:border-ink-faint transition-colors"
    >
      {label}
    </button>
  );
}
