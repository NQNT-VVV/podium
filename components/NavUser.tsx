'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { api } from '@/lib/client';
import { toast } from '@/lib/toast';
import type { Me } from '@/lib/types';
import { Avatar } from './Avatar';

export function NavUser({ user }: { user: Me }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  async function logout() {
    try {
      await api('POST', '/api/auth/logout');
      toast('SESSION CLOSE', 'ok');
      setOpen(false);
      router.push('/');
      router.refresh();
    } catch (err) {
      toast((err as Error).message.toUpperCase(), 'err');
    }
  }

  return (
    <div className="nav-user" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu">
        <Avatar emoji={user.avatar} size="sm" />
        <span className="ellipsis" style={{ maxWidth: 140 }}>{user.pseudo}</span>
      </button>
      {open && (
        <div className="nav-menu" role="menu">
          <Link href={`/joueurs/${encodeURIComponent(user.pseudo)}`} onClick={() => setOpen(false)}>MON PROFIL<span className="meta">→</span></Link>
          <Link href="/moi" onClick={() => setOpen(false)}>REGLAGES<span className="meta">→</span></Link>
          {user.role === 'admin' && <Link href="/admin" onClick={() => setOpen(false)}>ADMINISTRATION<span className="meta">0x00</span></Link>}
          <button type="button" onClick={logout}>SE DECONNECTER<span className="meta">×</span></button>
        </div>
      )}
    </div>
  );
}
