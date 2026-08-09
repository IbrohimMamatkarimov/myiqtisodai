import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter, Manrope } from 'next/font/google';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.iqtisodai.uz'),
  title: 'IqtisodAI — Shaxsiy moliya va AI yordamchi',
  description:
    'IqtisodAI bilan xarajat va daromadlaringizni kuzating, chekni skanerlab avtomatik yozdiring, maqsadlar uchun pul jamg‘aring va AI moliyaviy maslahatchidan real vaqtda tavsiya oling — barchasi o‘zbek, rus va ingliz tillarida.',
  openGraph: {
    title: 'IqtisodAI — Shaxsiy moliya va AI yordamchi',
    description: 'Xarajatlaringizni kuzating, maqsadlar uchun jamg‘aring va AI yordamchidan maslahat oling.',
    url: 'https://www.iqtisodai.uz',
    siteName: 'IqtisodAI',
    images: [{ url: '/robotiqtisod.png', width: 1024, height: 1024, alt: 'IqtisodAI' }],
    locale: 'uz_UZ',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IqtisodAI — Shaxsiy moliya va AI yordamchi',
    description: 'Xarajatlaringizni kuzating, maqsadlar uchun jamg‘aring va AI yordamchidan maslahat oling.',
    images: ['/robotiqtisod.png'],
  },
  icons: {
    icon: '/robotiqtisod.png',
    apple: '/robotiqtisod.png',
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
