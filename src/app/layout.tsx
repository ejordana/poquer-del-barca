import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { UserProvider } from '@/context/UserContext';
import { Navbar } from '@/components/Navbar';
import { UserSelectorModal } from '@/components/UserSelectorModal';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'PoQuer del Barça - Lliga Familiar',
  description: 'La lliga de porres dels partits del FC Barcelona per a tota la família.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
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
      <body className={`${inter.className} min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased selection:bg-barca-blue selection:text-white pb-24 md:pb-10 font-sans`}>
        <UserProvider>
          <Navbar />
          <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
            {children}
          </main>
          <UserSelectorModal />
        </UserProvider>
      </body>
    </html>
  );
}
