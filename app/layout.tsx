import type { Metadata } from 'next';
import './globals.css';

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
        <main>{children}</main>
      </body>
    </html>
  );
}
