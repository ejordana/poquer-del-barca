'use client';

import { useUser } from '@/context/UserContext';
import { User, RefreshCw, Shield } from 'lucide-react';

export default function PerfilPage() {
  const { currentUser, setIsSelectorOpen, clearUser } = useUser();

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <User className="w-6 h-6 text-barca-blue" />
          Familiar Actiu
        </h1>
        {currentUser?.is_admin && (
          <span className="px-3 py-1 rounded-full bg-blue-100 text-barca-blue text-xs font-bold flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" /> Administrador
          </span>
        )}
      </div>

      {currentUser ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm space-y-4">
          <div
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl text-white text-xl font-bold shadow-md"
            style={{ backgroundColor: currentUser.avatar_color || '#004D98' }}
          >
            {currentUser.nom.substring(0, 2).toUpperCase()}
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">{currentUser.nom}</h2>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              Totes les porres d'aquest dispositiu es guarden al teu nom.
            </p>
          </div>

          <div className="pt-4 flex flex-col gap-2">
            <button
              onClick={() => setIsSelectorOpen(true)}
              className="w-full h-10 rounded-xl bg-barca-blue hover:bg-barca-blue-light text-white font-bold text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Canviar per un altre familiar</span>
            </button>

            <button
              onClick={clearUser}
              className="w-full h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs active:scale-95 transition-all"
            >
              Desconnectar d'aquest dispositiu
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="font-bold text-slate-800">No hi ha cap familiar seleccionat</p>
          <button
            onClick={() => setIsSelectorOpen(true)}
            className="mt-4 px-5 py-2.5 rounded-xl bg-barca-blue text-white font-bold text-xs"
          >
            Triar qui ets
          </button>
        </div>
      )}
    </div>
  );
}
