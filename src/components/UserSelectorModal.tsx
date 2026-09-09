'use client';

import { useUser } from '@/context/UserContext';
import { Profile } from '@/types/database';
import { Check, X, Shield } from 'lucide-react';

export function UserSelectorModal() {
  const { profiles, currentUser, selectUser, isSelectorOpen, setIsSelectorOpen } = useUser();

  if (!isSelectorOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-4 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        {/* Botó tancar només si ja hi ha un usuari seleccionat */}
        {currentUser && (
          <button
            onClick={() => setIsSelectorOpen(false)}
            className="absolute right-5 top-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-7 h-7" />
          </button>
        )}

        {/* Capçalera accessible */}
        <div className="text-center mb-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-barca-blue to-barca-red p-1 shadow-md mb-3">
            <span className="font-bold text-lg text-barca-yellow">FCB</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            {currentUser ? 'Canviar de Familiar' : 'Hola! Qui ets tu?'}
          </h2>
          <p className="text-base font-semibold text-slate-500 mt-1">
            Toca el teu nom per entrar a la porra:
          </p>
        </div>

        {/* Graella de botons grans amb els familiars */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {profiles.map((profile: Profile) => {
            const isSelected = currentUser?.id === profile.id || currentUser?.nom === profile.nom;
            return (
              <button
                key={profile.id}
                type="button"
                onClick={() => selectUser(profile)}
                className={`flex items-center gap-3.5 p-4 rounded-2xl border-2 text-left transition-all active:scale-95 ${
                  isSelected
                    ? 'border-barca-blue bg-blue-50/90 shadow-md ring-2 ring-barca-blue/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 shadow-sm'
                }`}
              >
                {/* Cercle d'inicial gran */}
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white font-bold text-lg shadow-sm"
                  style={{ backgroundColor: profile.avatar_color || '#004D98' }}
                >
                  {profile.nom.substring(0, 2).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <span className="block text-lg font-bold text-slate-900 truncate">
                    {profile.nom}
                  </span>
                  {profile.is_admin ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-barca-blue">
                      <Shield className="w-3.5 h-3.5" /> Admin
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">Familiar</span>
                  )}
                </div>

                {isSelected && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-barca-blue text-white">
                    <Check className="w-5 h-5 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <p className="text-center text-sm text-slate-400 mt-6 font-medium">
          Un cop triat, el teu mòbil et recordarà automàticament.
        </p>
      </div>
    </div>
  );
}
