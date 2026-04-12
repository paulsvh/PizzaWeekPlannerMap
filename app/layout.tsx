import type { Metadata, Viewport } from 'next';
import { Bodoni_Moda, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const bodoni = Bodoni_Moda({
  subsets: ['latin'],
  variable: '--font-bodoni-moda',
  weight: ['400', '500', '700', '900'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-plex-mono',
  weight: ['300', '400', '500', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Pizza Week Planner',
  description: 'Plan your Portland Pizza Week crawl with friends.',
  openGraph: {
    title: 'Pizza Week Planner',
    description:
      'Plan your Portland Pizza Week 2026 crawl — star restaurants, plot biking routes, and vote on the best pizza crawls with friends.',
    type: 'website',
    locale: 'en_US',
    siteName: 'Pizza Week Planner',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#f1ebdb',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bodoni.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
