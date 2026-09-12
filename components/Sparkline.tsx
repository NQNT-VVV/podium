/** Courbe de cote : une polyligne d'1 px, sans remplissage ni courbe. Le dernier segment est vivant. */
export function Sparkline({ points }: { points: { at: number; rating: number }[]; id?: string }) {
  if (points.length < 2) return <div className="meta">COURBE APRES 0x02 PARTIES</div>;
  const W = 320; const H = 48; const pad = 4;
  const ys = points.map((p) => p.rating);
  const min = Math.min(...ys); const max = Math.max(...ys);
  const span = Math.max(20, max - min);
  const mid = (min + max) / 2;
  const x = (i: number) => pad + (i * (W - 2 * pad)) / (points.length - 1);
  const y = (v: number) => H - pad - ((v - (mid - span / 2)) / span) * (H - 2 * pad);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.rating).toFixed(1)}`).join(' ');
  const n = points.length - 1;
  const last = `M${x(n - 1).toFixed(1)},${y(points[n - 1].rating).toFixed(1)} L${x(n).toFixed(1)},${y(points[n].rating).toFixed(1)}`;
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={d} />
      <path className="last" d={last} />
    </svg>
  );
}
