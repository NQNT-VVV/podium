import Link from 'next/link';

export function Brand({ compact = false, href = '/' as string | null }) {
  const content = (
    <>
      {!compact && <span className="brand-name">Podium</span>}
      <span className="brand-beta">V0.1 · Beta</span>
    </>
  );
  if (!href) return <span className="brand">{content}</span>;
  return <Link className="brand" href={href} aria-label="Podium — accueil">{content}</Link>;
}
