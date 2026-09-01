export function Avatar({ emoji, size = 'md', className = '' }: { emoji: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const style = size === 'sm' ? { width: 28, height: 28, fontSize: 15, borderRadius: 9 } : undefined;
  return (
    <span className={`avatar ${size === 'lg' ? 'lg' : ''} ${className}`} style={style} aria-hidden="true">
      {emoji || '🙂'}
    </span>
  );
}
