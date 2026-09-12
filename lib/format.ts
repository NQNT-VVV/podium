/** Formats francais : dates, durees, nombres. Rien ne depend du fuseau du serveur. */

const TZ = 'Europe/Paris';

export function fmtDate(ms: number, withTime = false): string {
  const d = new Date(ms);
  const date = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, day: '2-digit', month: '2-digit' }).format(d);
  if (!withTime) return date;
  return `${date} · ${new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(d)}`;
}

export function fmtLong(ms: number): string {
  return new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(ms));
}

export function fmtAgo(ms: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return 'A L’INSTANT';
  const m = Math.round(s / 60);
  if (m < 60) return `IL Y A ${m} MIN`;
  const h = Math.round(m / 60);
  if (h < 24) return `IL Y A ${h} H`;
  const d = Math.round(h / 24);
  if (d === 1) return 'HIER';
  if (d < 30) return `IL Y A ${d} J`;
  return fmtDate(ms);
}

export function fmtLeft(endsAt: number, now = Date.now()): string {
  const s = Math.round((endsAt - now) / 1000);
  if (s <= 0) return 'TERMINE';
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d >= 1) return `${d} J ${h} H`;
  if (h >= 1) return `${h} H ${String(m).padStart(2, '0')} MIN`;
  return `${m} MIN`;
}

export function fmtDuration(s: number | null | undefined): string {
  if (!s) return '';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} MIN`;
  return `${Math.floor(m / 60)} H${m % 60 ? ` ${m % 60}` : ''}`;
}

export function fmtNum(n: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(n);
}

export function fmtScore(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
}

export const MODE_LABEL: Record<string, string> = {
  classic: 'CLASSIQUE', input: 'REPONSE LIBRE', buzzer: 'BUZZER', artist: 'ARTISTE', daily: 'MUSIQUE DU JOUR',
  weekly: 'PLAYLIST DE LA SEMAINE', audio: 'AUDIO', image: 'IMAGE', video: 'VIDEO', text: 'TEXTE', file: 'LIBRE',
};

export function modeLabel(mode: string): string {
  return MODE_LABEL[mode] || mode.toUpperCase();
}

export function metricValue(metric: string, value: number): string {
  if (metric === 'best_score' || metric === 'score_sum') return fmtScore(value);
  return String(value);
}

/** Date longue en capitales, sans accent perdu : « 12 SEPTEMBRE 2026 ». */
export function fmtLongCaps(ms: number): string {
  return fmtLong(ms).toUpperCase();
}
