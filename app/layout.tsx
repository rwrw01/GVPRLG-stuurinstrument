import type { Metadata } from 'next';
import './globals.css';
import './components.css';
import { Kruimelpad } from '@/src/ui/components/Kruimelpad';

export const metadata: Metadata = {
  title: 'Volwassenheidsmeting GVPRLG',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>
        <header>
          <h1>Volwassenheidsmeting PinkRoccade Local Government</h1>
          <p className="subtitle">Gebruikersvereniging PinkRoccade LG</p>
        </header>
        <main>
          <Kruimelpad />
          {children}
        </main>
      </body>
    </html>
  );
}
