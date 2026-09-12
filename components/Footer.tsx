import Link from 'next/link';

export function Footer() {
  return (
    <footer className="footer">
      <span>PODIUM · PROJET PERSONNEL · AUCUN BUT COMMERCIAL · OUTIL TECHNIQUE POUR LES MINI-JEUX</span>
      <nav>
        <Link href="/avis">VOTRE AVIS</Link>
        <Link href="/confidentialite">CONFIDENTIALITE ET CONDITIONS</Link>
        <a href="https://github.com/NQNT-VVV/podium" target="_blank" rel="noopener">CODE SOURCE</a>
      </nav>
    </footer>
  );
}
