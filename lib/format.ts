/** Formats francais : dates, durees, nombres. Rien ne depend du fuseau du serveur. */

const TZ = 'Europe/Paris';

export function fmtDate(ms: number, withTime = false): string {
  const d = new Date(ms);
  const date = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, day: '2-digit', month: 'short' }).format(d);
  if (!withTime) return date;
  return `${date} · ${new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(d)}`;
}

export function fmtLong(ms: number): string {
  return new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(ms));
}

export function fmtAgo(ms: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return 'a l’instant';
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return 'hier';
  if (d < 30) return `il y a ${d} j`;
  return fmtDate(ms);
}

export function fmtLeft(endsAt: number, now = Date.now()): string {
  const s = Math.round((endsAt - now) / 1000);
  if (s <= 0) return 'termine';
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d >= 1) return `${d} j ${h} h`;
  if (h >= 1) return `${h} h ${String(m).padStart(2, '0')} min`;
  return `${m} min`;
}

export function fmtDuration(s: number | null | undefined): string {
  if (!s) return '';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60}` : ''}`;
}

export function fmtNum(n: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(n);
}

export function fmtScore(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
}

export const MODE_LABEL: Record<string, string> = {
  classic: 'Classique', input: 'Reponse libre', buzzer: 'Buzzer', artist: 'Mode artiste', daily: 'Musique du jour',
  audio: 'Audio', image: 'Image', video: 'Video', text: 'Texte', file: 'Libre',
};

export function modeLabel(mode: string): string {
  return MODE_LABEL[mode] || mode.charAt(0).toUpperCase() + mode.slice(1);
}

export const MEDALS = ['🥇', '🥈', '🥉'];

export function metricValue(metric: string, value: number): string {
  if (metric === 'best_score' || metric === 'score_sum') return fmtScore(value);
  return String(value);
}
