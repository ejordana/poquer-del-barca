import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { UserProvider } from '@/context/UserContext';
import { Navbar } from '@/components/Navbar';
import { UserSelectorModal } from '@/components/UserSelectorModal';
import { PointsNotifier } from '@/components/PointsNotifier';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'PoQuer del Barça - Lliga Familiar',
  description: 'La lliga de porres dels partits del FC Barcelona per a tota la família.',
  icons: {
    icon: '/icon-512.png',
    apple: '/icon-192.png',
  },
};

export const viewport = {
  themeColor: '#004D98',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ca" className={inter.variable}>
      <head>
        {/* Afegit manualment (en comptes de metadata.manifest) perquè Next.js
            afegeix "crossOrigin=use-credentials" automàticament quan es fa
            servir la propietat metadata.manifest, cosa que pot interferir amb
            la detecció d'instal·labilitat de la PWA a Chrome/Android. */}
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${inter.className} min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased selection:bg-barca-blue selection:text-white pb-24 md:pb-10 font-sans`}>
        <UserProvider>
          <Navbar />
          <PointsNotifier />
          <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
            {children}
          </main>
          <UserSelectorModal />
        </UserProvider>
      </body>
    </html>
  );
}
