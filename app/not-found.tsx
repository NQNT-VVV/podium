import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="shell narrow">
      <header className="hero">
        <div className="meta-line"><span>ERREUR 0x04</span><span>RESSOURCE INTROUVABLE</span></div>
        <h1>0x0404</h1>
        <p>Cette page n’existe pas, ou plus. Le systeme a note votre passage.</p>
        <div className="cta"><Link className="btn primary" href="/">RETOUR A L’ACCUEIL</Link></div>
      </header>
    </main>
  );
}
