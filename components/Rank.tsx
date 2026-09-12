import { hex } from '@/lib/hex';

/**
 * Rang de classement. Le premier porte l'aplat d'or — le seul de l'ecran.
 * Les humains commencent a 0x01 ; 0x00 serait le systeme.
 */
export function Rank({ pos }: { pos: number | null }) {
  if (pos === null) return <span className="meta">——</span>;
  if (pos === 1) return <span className="first">{hex(pos)}</span>;
  return <span>{hex(pos)}</span>;
}
