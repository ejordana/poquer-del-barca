'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Match, HomeAway, MatchStatus } from '@/types/database';
import { PlusCircle, RefreshCw, Save, CheckCircle, AlertTriangle } from 'lucide-react';

interface AdminMatchEditorProps {
  matches: Match[];
  onMatchesChanged: () => void;
}

export function AdminMatchEditor({ matches, onMatchesChanged }: AdminMatchEditorProps) {
  // Estat per a nou partit manual
  const [rival, setRival] = useState('');
  const [competition, setCompetition] = useState('La Lliga');
  const [matchDate, setMatchDate] = useState('');
  const [homeAway, setHomeAway] = useState<HomeAway>('HOME');
  const [isCreating, setIsCreating] = useState(false);

  // Estat per sincronització API
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Estat per editar resultats
  const [selectedMatchId, setSelectedMatchId] = useState<string>(matches[0]?.id || '');
  const [editStatus, setEditStatus] = useState<MatchStatus>('finished');
  const [editGoalsBarca, setEditGoalsBarca] = useState<number>(0);
  const [editGoalsRival, setEditGoalsRival] = useState<number>(0);
  const [isSavingScore, setIsSavingScore] = useState(false);
  const [scoreMessage, setScoreMessage] = useState<string | null>(null);

  const supabase = createClient();

  // Assegurar que sempre hi ha un partit seleccionat quan arriben els partits
  // (matches es carrega de forma asíncrona al component pare, així que pot
  // estar buit en el primer render).
  useEffect(() => {
    if (matches.length === 0) return;
    if (!selectedMatchId || !matches.some((m) => m.id === selectedMatchId)) {
      handleSelectMatch(matches[0].id);
    }
  }, [matches]);

  const handleSelectMatch = (matchId: string) => {
    setSelectedMatchId(matchId);
    const m = matches.find((item) => item.id === matchId);
    if (m) {
      setEditStatus(m.status);
      setEditGoalsBarca(m.goals_barca ?? 0);
      setEditGoalsRival(m.goals_rival ?? 0);
    }
  };

  // Crear partit a mà
  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rival || !matchDate) return;

    setIsCreating(true);
    try {
      const { error } = await supabase.from('matches').insert({
        rival,
        competition,
        match_date: new Date(matchDate).toISOString(),
        home_away: homeAway,
        status: 'scheduled',
      });

      if (error) throw error;

      setRival('');
      setMatchDate('');
      onMatchesChanged();
      alert('Partit afegit correctament al calendari!');
    } catch (err: any) {
      alert('Error creant partit: ' + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  // Guardar resultat i forçar càlcul de punts
  const handleSaveScore = async () => {
    if (!selectedMatchId) return;

    setIsSavingScore(true);
    setScoreMessage(null);

    try {
      const { error: updateErr } = await supabase
        .from('matches')
        .update({
          status: editStatus,
          goals_barca: editStatus === 'finished' ? editGoalsBarca : null,
          goals_rival: editStatus === 'finished' ? editGoalsRival : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedMatchId);

      if (updateErr) throw updateErr;

      // Cridar càlcul de punts
      const { error: rpcErr } = await supabase.rpc('calculate_match_points', { target_match_id: selectedMatchId });
      if (rpcErr) throw rpcErr;

      setScoreMessage('Resultat desat i punts de la família calculats correctament!');
      onMatchesChanged();
    } catch (err: any) {
      console.error(err);
      setScoreMessage('Error: ' + err.message);
    } finally {
      setIsSavingScore(false);
    }
  };

  // Sincronitzar
  const handleSync = async (useSample = false) => {
    setIsSyncing(true);
    setSyncMessage(null);

    try {
      const res = await fetch('/api/sync-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sample: useSample }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error en sincronitzar');

      setSyncMessage(
        `${data.message} (${data.stats?.inserted} nous, ${data.stats?.updated} actualitzats, ${data.stats?.pointsCalculated ?? 0} amb punts calculats)`
      );
      onMatchesChanged();
    } catch (err: any) {
      setSyncMessage('Error: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Introduir el resultat final d'un partit */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Save className="w-5 h-5 text-barca-blue" />
          Posar el Resultat Final d'un Partit
        </h3>
        <p className="text-xs text-slate-500">
          Quan el partit acabi, indica els gols i fes clic al botó verd. Es calcularan automàticament els punts de tothom!
        </p>

        {matches.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No hi ha partits a la base de dades.</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tria el partit:
              </label>
              <select
                value={selectedMatchId}
                onChange={(e) => handleSelectMatch(e.target.value)}
                className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:border-barca-blue"
              >
                {matches.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.competition} | {m.home_away === 'HOME' ? `Barça vs ${m.rival}` : `${m.rival} vs Barça`} ({m.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Estat del partit:
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as MatchStatus)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:border-barca-blue"
                >
                  <option value="finished">Finalitzat (Finished)</option>
                  <option value="live">En directe (Live)</option>
                  <option value="scheduled">Programat (Scheduled)</option>
                  <option value="postponed">Ajornat (Postponed)</option>
                </select>
              </div>

              {editStatus === 'finished' && (
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Gols Barça:
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editGoalsBarca}
                      onChange={(e) => setEditGoalsBarca(parseInt(e.target.value) || 0)}
                      className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-3 text-base font-bold text-slate-900 text-center"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Gols Rival:
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editGoalsRival}
                      onChange={(e) => setEditGoalsRival(parseInt(e.target.value) || 0)}
                      className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-3 text-base font-bold text-slate-900 text-center"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleSaveScore}
              disabled={isSavingScore}
              className="w-full h-10 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSavingScore ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              <span>GUARDAR RESULTAT I RESOLDRE PUNTS</span>
            </button>

            {scoreMessage && (
              <p className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                {scoreMessage}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 2. Sincronitzar partits */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-barca-blue" />
          Sincronitzar Partits del Barça
        </h3>
        <p className="text-xs text-slate-500">
          Carrega automàticament els partits de La Lliga i Champions League des de football-data.org.
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => handleSync(false)}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-barca-blue hover:bg-barca-blue-light text-white text-xs font-bold shadow-xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Sincronitzar amb API Oficial
          </button>

          <button
            type="button"
            onClick={() => handleSync(true)}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Carregar Partits de Prova
          </button>
        </div>

        {syncMessage && (
          <p className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 p-3 rounded-xl">
            {syncMessage}
          </p>
        )}
      </div>

      {/* 3. Afegir partit a mà */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-barca-blue" />
          Afegir un Partit a Mà
        </h3>
        <p className="text-xs text-slate-500">
          Útil per a partits de Copa del Rei o amistosos que vulguis programar tu mateix.
        </p>

        <form onSubmit={handleCreateMatch} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Rival:</label>
              <input
                type="text"
                placeholder="Ex: Reial Madrid"
                value={rival}
                onChange={(e) => setRival(e.target.value)}
                required
                className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-barca-blue"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Competició:</label>
              <select
                value={competition}
                onChange={(e) => setCompetition(e.target.value)}
                className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-barca-blue"
              >
                <option value="La Lliga">La Lliga</option>
                <option value="Champions League">Champions League</option>
                <option value="Copa del Rei">Copa del Rei</option>
                <option value="Supercopa d'Espanya">Supercopa d'Espanya</option>
                <option value="Amistós">Amistós</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Data i Hora:</label>
              <input
                type="datetime-local"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                required
                className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-barca-blue"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">On es juga:</label>
              <select
                value={homeAway}
                onChange={(e) => setHomeAway(e.target.value as HomeAway)}
                className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-barca-blue"
              >
                <option value="HOME">Barça Local (Camp Nou / Estadi)</option>
                <option value="AWAY">Barça Visitant (A domicili)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isCreating}
            className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all active:scale-95 disabled:opacity-50"
          >
            {isCreating ? 'Afegint...' : 'Afegir Partit al Calendari'}
          </button>
        </form>
      </div>
    </div>
  );
}
