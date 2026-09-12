import type { Metadata } from 'next';

import { Salon } from '@/components/Salon';
import { apiGet } from '@/lib/api';
import type { ChatData } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Salon',
  description: 'Le salon de Podium : un fil commun pour se donner rendez-vous et commenter les parties.',
};

export default async function SalonPage() {
  /*
   * Le fil part avec la page.
   *
   * Rendu au serveur, il est lisible avant que le moindre script tourne — et
   * quelqu'un qui arrive voit tout de suite s'il y a de la vie, au lieu d'un
   * cadre vide qui se remplira peut-etre.
   */
  let data: ChatData = {
    messages: [], cursor: 0, me: null,
    limits: { length: 500, gapMs: 2000, keepDays: 90 },
  };
  try {
    data = await apiGet<ChatData>('/api/chat');
  } catch {
    // L'API ne repond pas : la page s'affiche quand meme, et le sondage
    // rattrapera le fil des qu'elle revient.
  }

  return (
    <main className="shell">
      <header className="page-head">
        <div>
          <div className="kicker"><span>SECTION 0x08</span><span>SALON · FIL COMMUN</span></div>
          <h1>SALON</h1>
          <p>
            Un seul fil, pour tout le monde. On s’y donne rendez-vous, on commente une partie, on
            reclame un adversaire. Les messages s’effacent d’eux-memes au bout de {data.limits.keepDays} jours.
          </p>
        </div>
      </header>
      <Salon initial={data} />
    </main>
  );
}
