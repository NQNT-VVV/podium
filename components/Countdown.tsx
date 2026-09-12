'use client';

import { useEffect, useState } from 'react';

import { fmtLeft } from '@/lib/format';

/** Temps restant, rafraichi chaque minute. Une donnee qui vit : elle est en sang. */
export function Countdown({ endsAt, prefix = 'RESTE' }: { endsAt: number; prefix?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);
  const left = fmtLeft(endsAt, now);
  return <span className="countdown" suppressHydrationWarning>{left === 'TERMINE' ? 'TERMINE' : `${prefix} ${left}`}</span>;
}
