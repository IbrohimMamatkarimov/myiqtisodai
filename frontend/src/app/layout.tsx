import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter, Manrope } from 'next/font/google';

export const metadata: Metadata = {
  metadataBase: new URL('https://iqtisodai.uz'),
  title: 'IqtisodAI — Shaxsiy moliya va AI yordamchi',
  description:
    'IqtisodAI bilan xarajat va daromadlaringizni kuzating, chekni skanerlab avtomatik yozdiring, maqsadlar uchun pul jamg‘aring va AI moliyaviy maslahatchidan real vaqtda tavsiya oling — barchasi o‘zbek, rus va ingliz tillarida.',
  openGraph: {
    title: 'IqtisodAI — Shaxsiy moliya va AI yordamchi',
    description: 'Xarajatlaringizni kuzating, maqsadlar uchun jamg‘aring va AI yordamchidan maslahat oling.',
    url: 'https://iqtisodai.uz',
    siteName: 'IqtisodAI',
    images: [{ url: '/iqtisodaiphoto.png', width: 1254, height: 1254, alt: 'IqtisodAI' }],
    locale: 'uz_UZ',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IqtisodAI — Shaxsiy moliya va AI yordamchi',
    description: 'Xarajatlaringizni kuzating, maqsadlar uchun jamg‘aring va AI yordamchidan maslahat oling.',
    images: ['/iqtisodaiphoto.png'],
  },
  icons: {
    // ?v=2 cache-busts the favicon specifically - browsers cache favicons far
    // more aggressively than regular assets and often ignore normal cache
    // invalidation, so a plain path swap alone can keep showing the old one
    // indefinitely. Bump this number again if it ever needs to change further.
    icon: '/iqtisodaiphoto.png?v=2',
    apple: '/iqtisodaiphoto.png?v=2',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#16A34A',
};

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
