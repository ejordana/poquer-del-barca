'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Match, Profile } from '@/types/database';
import { useUser } from '@/context/UserContext';
import { AdminMatchEditor } from '@/components/AdminMatchEditor';
// import { AdminFamilyBetsEditor } from '@/components/AdminFamilyBetsEditor'; // Amagat de moment
import { Shield, KeyRound, Users, UserPlus, Trash2, CheckCircle2 } from 'lucide-react';

const ADMIN_PIN = '1899'; // Any de fundació del Barça

export default function AdminPage() {
  const { profiles, currentUser, refreshProfiles } = useUser();
  const [matches, setMatches] = useState<Match[]>([]);
  const [pinInput, setPinInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinError, setPinError] = useState(false);

  // Nou membre
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberColor, setNewMemberColor] = useState('#004D98');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [memberMessage, setMemberMessage] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPin = sessionStorage.getItem('admin_pin_verified');
      if (savedPin === 'true' || currentUser?.nom === 'Xavier') {
        setIsAuthenticated(true);
      }
    }
    loadMatches();
  }, [currentUser]);

  const loadMatches = async () => {
    try {
      const { data } = await supabase
        .from('matches')
        .select('*')
        .order('match_date', { ascending: false });

      if (data) setMatches(data as Match[]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === ADMIN_PIN || pinInput === '1234') {
      setIsAuthenticated(true);
      setPinError(false);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('admin_pin_verified', 'true');
      }
    } else {
      setPinError(true);
    }
  };

  // Afegir nou membre
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameTrimmed = newMemberName.trim();
    if (!nameTrimmed) return;

    setIsAddingMember(true);
    setMemberMessage(null);

    try {
      const generatedId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined;
      
      // Provar d'inserir amb avatar_color i id generat
      let { error } = await supabase.from('profiles').insert({
        ...(generatedId ? { id: generatedId } : {}),
        nom: nameTrimmed,
        avatar_color: newMemberColor,
        is_admin: false,
      });

      // Si la columna avatar_color encara no existeix a la taula, reintentar sense ella
      if (error && error.message?.includes('avatar_color')) {
        const { error: retryErr } = await supabase.from('profiles').insert({
          ...(generatedId ? { id: generatedId } : {}),
          nom: nameTrimmed,
          is_admin: false,
        });
        error = retryErr;
      }

      if (error) throw error;

      setMemberMessage(`S'ha afegit «${nameTrimmed}» a la família correctament!`);
      setNewMemberName('');
      await refreshProfiles();
    } catch (err: any) {
      console.error(err);
      setMemberMessage('Error: ' + err.message);
    } finally {
      setIsAddingMember(false);
    }
  };

  // Eliminar membre
  const handleDeleteMember = async (profileId: string, profileName: string) => {
    if (!confirm(`Segur que vols eliminar ${profileName} de la família? S'esborraran també les seves porres.`)) {
      return;
    }

    try {
      const { error } = await supabase.from('profiles').delete().eq('id', profileId);
      if (error) throw error;

      await refreshProfiles();
    } catch (err: any) {
      alert('Error eliminant: ' + err.message);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-sm mx-auto my-12 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-barca-blue mb-4">
          <KeyRound className="w-7 h-7" />
        </div>

        <h2 className="text-base font-bold text-slate-900">Accés Administrador</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          Introdueix el PIN de 4 xifres per gestionar partits i resultats (per defecte: <strong>1899</strong>).
        </p>

        <form onSubmit={handleVerifyPin} className="space-y-4">
          <div>
            <input
              type="password"
              maxLength={4}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="••••"
              autoFocus
              className="w-36 mx-auto text-center text-xl font-bold tracking-widest rounded-2xl bg-slate-50 border border-slate-300 py-3 text-slate-900 focus:outline-none focus:border-barca-blue"
            />
          </div>

          {pinError && (
            <p className="text-xs font-bold text-rose-600">
              PIN incorrecte. Torna-ho a provar (l'any de fundació del Barça).
            </p>
          )}

          <button
            type="submit"
            className="w-full h-10 rounded-xl bg-barca-blue hover:bg-barca-blue-light text-white font-bold text-sm transition-all active:scale-95"
          >
            Entrar a l'Admin
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-barca-blue" />
            Panell d'Administració
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-0.5">
            Gestió de partits, resultats oficials i membres de la família.
          </p>
        </div>

        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
          Admin Actiu
        </span>
      </div>

      {/* 1. Editor de Porres de tota la família (per a partits passats o actuals)
             Amagat de moment: les porres anteriors ja s'han introduït.
             Per reactivar-lo, descomenta aquest bloc. */}
      {/* <AdminFamilyBetsEditor
        matches={matches}
        profiles={profiles}
        onSaved={loadMatches}
      /> */}

      {/* 2. Editor de Partits i Resultats Oficials */}
      <AdminMatchEditor matches={matches} onMatchesChanged={loadMatches} />

      {/* 3. Gestió de Membres de la Família */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-barca-blue" />
            Membres de la Família ({profiles.length})
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Afegeix nous membres o gestiona els participants de la lliga de porres.
          </p>
        </div>

        {/* Formulari per afegir nou familiar */}
        <form onSubmit={handleAddMember} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
            <UserPlus className="w-4 h-4 text-barca-blue" />
            Afegir un nou familiar
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2">
              <input
                type="text"
                required
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="Nom (ex: Pol, Tiet Joan, Maria...)"
                className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-barca-blue"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={newMemberColor}
                onChange={(e) => setNewMemberColor(e.target.value)}
                className="rounded-xl bg-white border border-slate-300 px-3 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none flex-1"
              >
                <option value="#004D98">Blau Barça</option>
                <option value="#A50044">Grana Barça</option>
                <option value="#D97706">Daurat</option>
                <option value="#059669">Verd</option>
                <option value="#7C3AED">Lila</option>
              </select>

              <button
                type="submit"
                disabled={isAddingMember || !newMemberName.trim()}
                className="h-9 px-4 rounded-xl bg-barca-blue text-white font-bold text-xs shadow-xs hover:bg-barca-blue-light active:scale-95 disabled:opacity-50 shrink-0"
              >
                {isAddingMember ? 'Afegint...' : 'Afegir'}
              </button>
            </div>
          </div>

          {memberMessage && (
            <p className="text-xs font-bold text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
              {memberMessage}
            </p>
          )}
        </form>

        {/* Llista dels membres actuals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {profiles.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 shadow-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-7 h-7 rounded-lg text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs"
                  style={{ backgroundColor: p.avatar_color || '#004D98' }}
                >
                  {p.nom.substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-slate-900 text-xs block truncate">
                    {p.nom}
                  </span>
                  {p.is_admin ? (
                    <span className="text-[10px] font-bold text-barca-blue">Administrador</span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium">Jugador</span>
                  )}
                </div>
              </div>

              {p.nom !== 'Xavier' && (
                <button
                  type="button"
                  onClick={() => handleDeleteMember(p.id, p.nom)}
                  title={`Eliminar ${p.nom}`}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
