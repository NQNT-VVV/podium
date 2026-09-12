import type { Tier } from '@/lib/types';

/** Palier : un badge d'os. L'or est reserve au premier du classement. */
export function TierChip({ tier, large = false }: { tier: Tier; large?: boolean }) {
  const placement = tier.id === 'placement';
  const label = placement && tier.progress !== undefined
    ? `PLACEMENT ${Math.round(tier.progress * 3)}/3`
    : tier.label.toUpperCase();
  return <span className={`tier ${placement ? 'placement' : ''} ${large ? 'lg' : ''}`}>{label}</span>;
}
