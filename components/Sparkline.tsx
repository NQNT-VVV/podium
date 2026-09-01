/** Courbe de cote, en SVG inline. Rien d'interactif : une tendance, pas un graphique. */
export function Sparkline({ points, id }: { points: { at: number; rating: number }[]; id: string }) {
  if (points.length < 2) return <div className="faint" style={{ fontSize: 12 }}>Courbe disponible apres deux parties.</div>;
  const W = 320; const H = 48; const pad = 3;
  const ys = points.map((p) => p.rating);
  const min = Math.min(...ys); const max = Math.max(...ys);
  const span = Math.max(20, max - min);
  const x = (i: number) => pad + (i * (W - 2 * pad)) / (points.length - 1);
  const y = (v: number) => H - pad - ((v - (min - (span - (max - min)) / 2)) / span) * (H - 2 * pad);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.rating).toFixed(1)}`).join(' ');
  const area = `${d} L${x(points.length - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z`;
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={`sparkfill-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#22d3ee" stopOpacity=".35" />
          <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sparkfill-${id})`} stroke="none" />
      <path d={d} />
    </svg>
  );
}
