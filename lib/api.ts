import { headers } from 'next/headers';

/**
 * Appels a l'API depuis les composants serveur.
 *
 * Les pages tournent dans le meme processus que l'API : on passe par la
 * boucle locale, sans cache, en transmettant le cookie du visiteur pour que
 * les reponses tiennent compte de qui regarde.
 */
const BASE = process.env.INTERNAL_API_URL || `http://127.0.0.1:${process.env.PORT || 3000}`;

export class ApiFailure extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const h = await headers();
  const res = await fetch(BASE + path, { cache: 'no-store', headers: { cookie: h.get('cookie') ?? '' } });
  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try { message = (await res.json()).error || message; } catch { /* corps vide */ }
    throw new ApiFailure(res.status, message);
  }
  return res.json() as Promise<T>;
}

/** Comme apiGet, mais rend null sur 404 : pour les pages qui basculent sur notFound(). */
export async function apiMaybe<T>(path: string): Promise<T | null> {
  try {
    return await apiGet<T>(path);
  } catch (err) {
    if (err instanceof ApiFailure && err.status === 404) return null;
    throw err;
  }
}
