import type { Tier } from '@/lib/types';

export function TierChip({ tier, large = false }: { tier: Tier; large?: boolean }) {
  const label = tier.id === 'placement' && tier.progress !== undefined
    ? `Placement ${Math.round(tier.progress * 3)}/3`
    : tier.label;
  return (
    <span className={`tier ${large ? 'lg' : ''}`} style={{ ['--tier' as string]: tier.color }}>
      <span aria-hidden="true">{tier.emoji}</span> {label}
    </span>
  );
}
