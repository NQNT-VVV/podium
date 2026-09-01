'use client';

import { useEffect, useState } from 'react';

import { fmtLeft } from '@/lib/format';

/** Temps restant, rafraichi chaque minute. Rendu identique serveur/client au premier affichage. */
export function Countdown({ endsAt, prefix = 'se termine dans' }: { endsAt: number; prefix?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);
  const left = fmtLeft(endsAt, now);
  return <span className="countdown" suppressHydrationWarning>{left === 'termine' ? 'termine' : `${prefix} ${left}`}</span>;
}
