export function Delta({ before, after }: { before: number | null; after: number | null }) {
  if (before === null || after === null) return null;
  const d = Math.round(after - before);
  const cls = d > 0 ? 'up' : d < 0 ? 'down' : 'flat';
  return <span className={`delta ${cls}`}>{d > 0 ? `+${d}` : d === 0 ? '±0' : d}</span>;
}
