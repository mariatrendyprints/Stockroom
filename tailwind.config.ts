import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    screens: {
      sm: "480px",
      wk: "860px",
      lg: "1024px",
      xl: "1280px",
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-plex-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-raised": "var(--color-surface-raised)",
        border: "var(--color-border)",
        ink: "var(--color-ink)",
        "ink-muted": "var(--color-ink-muted)",
        "ink-faint": "var(--color-ink-faint)",
        accent: "var(--color-accent)",
        "accent-ink": "var(--color-accent-ink)",
        "accent-soft": "var(--color-accent-soft)",
        amber: "var(--color-amber)",
        "amber-ink": "var(--color-amber-ink)",
        "amber-soft": "var(--color-amber-soft)",
        red: "var(--color-red)",
        "red-ink": "var(--color-red-ink)",
        "red-soft": "var(--color-red-soft)",
      },
      borderRadius: {
        card: "10px",
      },
    },
  },
  plugins: [],
};
export default config;
