'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { InstallAppButton } from './InstallAppButton';
import { Home, Trophy, Calendar, Shield, Users, RefreshCw } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const { currentUser, setIsSelectorOpen } = useUser();

  const navItems = [
    { label: 'Inici', href: '/', icon: Home },
    { label: 'Partits', href: '/partits', icon: Calendar },
    { label: 'Classificació', href: '/classificacio', icon: Trophy },
    { label: 'Admin', href: '/admin', icon: Shield },
  ];

  return (
    <>
      {/* Capçalera Superior Clara i Àmplia */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-xs">
        <div className="mx-auto flex h-20 max-w-2xl items-center justify-between px-4">
          {/* Títol gran */}
          <Link href="/" className="flex items-center gap-3">
            <span className="font-bold text-base tracking-tight text-slate-900 sm:text-lg">
              PoQuer del{' '}
              {'Barça'.split('').map((letter, i) => (
                <span key={i} className={i % 2 === 0 ? 'text-barca-blue' : 'text-barca-red'}>
                  {letter}
                </span>
              ))}
            </span>
          </Link>

          {/* Navegació Desktop */}
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-base font-semibold transition-all ${
                    isActive
                      ? 'bg-barca-blue text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Selector de familiar actiu */}
          <div className="flex items-center gap-2">
            <InstallAppButton />
            {currentUser ? (
              <button
                type="button"
                onClick={() => setIsSelectorOpen(true)}
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border-2 border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all shadow-xs"
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-white text-xs font-bold shadow-xs"
                  style={{ backgroundColor: currentUser.avatar_color || '#004D98' }}
                >
                  {currentUser.nom.substring(0, 2).toUpperCase()}
                </div>
                <div className="text-left">
                  <span className="block text-sm font-bold text-slate-900 leading-tight">
                    {currentUser.nom}
                  </span>
                  <span className="block text-xs font-semibold text-barca-blue flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Canviar
                  </span>
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsSelectorOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-barca-blue text-white text-sm font-semibold shadow-sm hover:brightness-110 active:scale-95 transition-all"
              >
                <Users className="w-4 h-4" />
                <span>Tria qui ets</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Barra de navegació inferior mòbil amb lletres i icones grans */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md shadow-xl pb-safe">
        <div className="grid grid-cols-4 h-18 max-w-md mx-auto">
          <Link
            href="/"
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              pathname === '/' ? 'text-barca-blue font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Home className="w-6 h-6 stroke-[2.5]" />
            <span className="text-xs font-bold">Inici</span>
          </Link>

          <Link
            href="/partits"
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              pathname === '/partits' ? 'text-barca-blue font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-6 h-6 stroke-[2.5]" />
            <span className="text-xs font-bold">Partits</span>
          </Link>

          <Link
            href="/classificacio"
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              pathname === '/classificacio'
                ? 'text-barca-blue font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Trophy className="w-6 h-6 stroke-[2.5]" />
            <span className="text-xs font-bold">Rànquing</span>
          </Link>

          <Link
            href="/admin"
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              pathname === '/admin' ? 'text-barca-blue font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Shield className="w-6 h-6 stroke-[2.5]" />
            <span className="text-xs font-bold">Admin</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
