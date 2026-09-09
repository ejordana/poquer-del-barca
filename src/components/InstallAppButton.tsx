'use client';

import { useEffect, useState } from 'react';
import { Download, X, Share, PlusSquare } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  if (isStandalone) return null;
  if (!deferredPrompt && !isIOS) return null;

  const handleClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }
    if (isIOS) {
      setShowIOSHelp(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title="Instal·la l'app"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-barca-blue hover:border-barca-blue/40 transition-colors shadow-xs"
      >
        <Download className="w-4 h-4" />
      </button>

      {showIOSHelp && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200">
            <button
              onClick={() => setShowIOSHelp(false)}
              className="absolute right-3 top-3 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 mb-3">Instal·la l'app a l'iPhone</h3>
            <ol className="space-y-2.5 text-sm text-slate-700 font-medium">
              <li className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold">1</span>
                Toca la icona <Share className="inline w-4 h-4 mx-1 text-barca-blue" /> Compartir de Safari
              </li>
              <li className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold">2</span>
                Tria <PlusSquare className="inline w-4 h-4 mx-1 text-barca-blue" /> "Afegeix a pantalla d'inici"
              </li>
              <li className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold">3</span>
                Confirma tocant "Afegeix"
              </li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
