export default function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs text-ink-muted mb-1">{label}</span>
      {children}
    </label>
  );
}
