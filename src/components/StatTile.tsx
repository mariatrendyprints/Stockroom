type Props = {
  label: string;
  value: string;
  tone?: "default" | "amber" | "red";
};

export default function StatTile({ label, value, tone = "default" }: Props) {
  const toneClasses =
    tone === "amber"
      ? "text-amber"
      : tone === "red"
        ? "text-red"
        : "text-ink";

  return (
    <div className="rounded-card border border-border bg-surface px-4 py-3">
      <div className="text-xs text-ink-muted mb-1">{label}</div>
      <div className={`font-mono text-xl font-semibold ${toneClasses}`}>{value}</div>
    </div>
  );
}
