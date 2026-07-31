import './globals.css';
import { Inter, Manrope } from 'next/font/google';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-body',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
  display: 'swap',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={`${inter.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}
