import Link from 'next/link';

import { apiGet } from '@/lib/api';
import type { AuthMe } from '@/lib/types';
import { Brand } from './Brand';
import { NavUser } from './NavUser';

const LINKS = [
  { href: '/', label: 'JEUX' },
  { href: '/classement', label: 'CLASSEMENT' },
  { href: '/defis', label: 'DEFIS' },
  { href: '/salon', label: 'SALON' },
];

export async function Nav() {
  let me: AuthMe = { user: null, providers: { password: true, discord: false } };
  try {
    me = await apiGet<AuthMe>('/api/auth/me');
  } catch {
    // L'API est injoignable : la barre s'affiche quand meme, sans compte.
  }
  return (
    <nav className="nav">
      <Brand />
      <div className="nav-links">
        {LINKS.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}
      </div>
      <span className="spacer" />
      <span className="nav-status"><span className="dot" />SESSION CONSIGNEE</span>
      {me.user ? <NavUser user={me.user} /> : <Link className="btn sm primary" href="/connexion">SE CONNECTER</Link>}
    </nav>
  );
}
