import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Color_Emoji, Space_Grotesk } from 'next/font/google';

import { Aurora } from '@/components/Aurora';
import { Nav } from '@/components/Nav';
import { Toaster } from '@/components/Toaster';
import './globals.css';

const body = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body', display: 'swap' });
const display = Space_Grotesk({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-display', display: 'swap' });
/** Avatars, paliers et medailles sont des emoji : on embarque une police pour un rendu identique partout. */
const emoji = Noto_Color_Emoji({ subsets: ['emoji'], weight: '400', variable: '--font-emoji', display: 'swap', preload: false });

const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E🏆%3C/text%3E%3C/svg%3E";

export const metadata: Metadata = {
  title: { default: 'Podium — Le hub des jeux', template: '%s — Podium' },
  description: 'Podium reunit les jeux, les comptes, le classement Elo et les defis de la semaine.',
  applicationName: 'Podium',
  icons: { icon: FAVICON },
};

export const viewport: Viewport = { themeColor: '#07060e', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${body.variable} ${display.variable} ${emoji.variable}`}>
      <body>
        <Aurora />
        <Nav />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
