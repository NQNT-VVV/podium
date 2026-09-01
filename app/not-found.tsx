import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="shell narrow" style={{ textAlign: 'center', paddingTop: '10vh' }}>
      <div style={{ fontSize: 64 }} aria-hidden="true">🫥</div>
      <h1>Rien ici</h1>
      <p className="muted">Cette page n’existe pas, ou plus.</p>
      <p><Link className="btn primary" href="/">Retour a l’accueil</Link></p>
    </main>
  );
}
