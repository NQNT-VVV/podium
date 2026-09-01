import Link from 'next/link';

export function Brand({ compact = false, href = '/' as string | null }) {
  const content = (
    <>
      <span className="brand-mark" aria-hidden="true">🏆</span>
      {!compact && <span className="brand-name">Podium</span>}
      <span className="brand-beta">beta</span>
    </>
  );
  if (!href) return <span className="brand">{content}</span>;
  return <Link className="brand" href={href} aria-label="Podium — accueil">{content}</Link>;
}
