/** Motif grave : cercles, hexagone, triangle. De l'or a .35, jamais au-dessus du texte. */
export function Engraving() {
  return (
    <svg className="engraving" viewBox="0 0 400 400" aria-hidden="true">
      <circle cx="200" cy="200" r="190" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="200" cy="200" r="170" fill="none" stroke="currentColor" strokeWidth="12" strokeDasharray="1 13.835" />
      <circle cx="200" cy="200" r="150" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="200" cy="200" r="60" fill="none" stroke="currentColor" strokeWidth="1" />
      <polygon points="350,200 275,329.9 125,329.9 50,200 125,70.1 275,70.1" fill="none" stroke="currentColor" strokeWidth="1" />
      <polygon points="200,50 329.9,275 70.1,275" fill="none" stroke="currentColor" strokeWidth="1" />
      <line x1="200" y1="0" x2="200" y2="400" stroke="currentColor" strokeWidth="1" />
      <line x1="0" y1="200" x2="400" y2="200" stroke="currentColor" strokeWidth="1" />
      <rect x="196" y="196" width="8" height="8" fill="currentColor" />
    </svg>
  );
}
