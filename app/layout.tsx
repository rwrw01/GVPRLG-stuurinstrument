import type { Metadata } from 'next';
import './globals.css';
import './components.css';
import './schil.css';
import './overzicht.css';
import { Schil } from '@/src/ui/components/schil/Schil';

export const metadata: Metadata = {
  title: 'Spinnenweb GVPRLG',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>
        <Schil>{children}</Schil>
      </body>
    </html>
  );
}
