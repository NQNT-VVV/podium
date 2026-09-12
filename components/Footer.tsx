import Link from 'next/link';

export function Footer() {
  return (
    <footer className="footer">
      <span>🏆 Podium — projet personnel, sans but commercial : un outil technique pour les mini-jeux.</span>
      <nav>
        <Link href="/confidentialite">Confidentialite et conditions</Link>
        <a href="https://github.com/NQNT-VVV/podium" target="_blank" rel="noopener">Code source</a>
      </nav>
    </footer>
  );
}
