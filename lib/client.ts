'use client';

/** Appels a l'API depuis le navigateur : meme origine, cookies inclus, erreurs lisibles. */
export async function api<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  });
  const text = await res.text();
  let json: { error?: string } & Record<string, unknown> = {};
  try { json = text ? JSON.parse(text) : {}; } catch { /* pas du JSON */ }
  if (!res.ok) throw new Error(json.error || `Erreur ${res.status}`);
  return json as T;
}
