/** Avatar 48 : carre en dither, le glyphe choisi par le joueur pose sur un aplat de fond, rendu en niveaux d'os. */
export function Avatar({ emoji, size = 'md', className = '' }: { emoji: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <span className={`avatar ${size !== 'md' ? size : ''} ${className}`} aria-hidden="true">
      <span>{emoji || '?'}</span>
    </span>
  );
}
