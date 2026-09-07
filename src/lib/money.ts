const formatter = new Intl.NumberFormat("en-PH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPeso(amount: number): string {
  return `₱${formatter.format(amount)}`;
}
