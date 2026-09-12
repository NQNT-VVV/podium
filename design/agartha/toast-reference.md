# Messages systeme (toasts) — CMP 0x0B

Le magasin `lib/toast.ts` porte un horodatage et une nature :

```ts
export type ToastKind = 'ok' | 'err' | 'info' | 'live';
export interface Toast { id: number; message: string; kind: ToastKind; at: number; leaving?: boolean }
// dans toast() : const item: Toast = { id: ++sequence, message, kind, at: Date.now() };
```

Le composant `components/Toaster.tsx` rend :

```tsx
<div id="toasts">
  {toasts.map((t) => (
    <div key={t.id} className={`toast ${t.kind} ${t.leaving ? 'out' : ''}`} role="status">
      <time>{stamp(t.at)}</time>
      <span>{t.message}</span>
    </div>
  ))}
</div>
```

Apparition 0 ms, disparition 0 ms (la classe `.out` masque), pile en bas a
droite, largeur max 440. `ok` = inversion (os sur fond), `err` = filet os +
bande hachuree, `live` = filet sang (quelque chose vient de se passer en jeu).
