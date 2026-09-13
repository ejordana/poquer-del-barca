'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Match, Bet } from '@/types/database';
import { MatchCard } from '@/components/MatchCard';
import { useUser } from '@/context/UserContext';
import { Calendar, Loader2 } from 'lucide-react';

const PAGE_SIZE = 3;

export default function PartitsPage() {
  const { currentUser } = useUser();
  const [matches, setMatches] = useState<Match[]>([]);
  const [userBets, setUserBets] = useState<Record<string, Bet>>({});
  const [familyBets, setFamilyBets] = useState<Record<string, Bet[]>>({});
  const [tab, setTab] = useState<'upcoming' | 'finished'>('upcoming');
  const [competitionFilter, setCompetitionFilter] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const loadData = async () => {
    try {
      setLoading(true);

      // Obtenir tots els partits i les porres de l'usuari actiu en paral·lel
      // (les porres de l'usuari no depenen de la llista de partits, només del seu id).
      const [{ data: matchesData }, { data: betsData }] = await Promise.all([
        supabase.from('matches').select('*').order('match_date', { ascending: tab === 'upcoming' }),
        currentUser
          ? supabase.from('bets').select('*').eq('user_id', currentUser.id)
          : Promise.resolve({ data: [] }),
      ]);

      const allMatches = (matchesData as Match[]) || [];
      setMatches(allMatches);

      const betsMap: Record<string, Bet> = {};
      betsData?.forEach((b: any) => {
        betsMap[b.match_id] = b;
      });
      setUserBets(betsMap);

      // Porres de tota la família per a tots els partits (depèn dels ids de dalt).
      const matchIds = allMatches.map((m) => m.id);

      if (matchIds.length > 0) {
        const { data: allFamilyBets } = await supabase
          .from('bets')
          .select('*, profile:profiles(*)')
          .in('match_id', matchIds);

        const famMap: Record<string, Bet[]> = {};
        allFamilyBets?.forEach((b: any) => {
          if (!famMap[b.match_id]) famMap[b.match_id] = [];
          famMap[b.match_id].push(b);
        });
        setFamilyBets(famMap);
      } else {
        setFamilyBets({});
      }
    } catch (err) {
      console.error('Error carregant partits:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tab, currentUser?.id]);

  // Reiniciar la paginació quan es canvia de pestanya o de filtre de competició
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [tab, competitionFilter]);

  const competitions = Array.from(new Set(matches.map((m) => m.competition))).sort();

  const filteredMatches = matches.filter((m) => {
    const isFinished = m.status === 'finished';
    const matchesTab = tab === 'finished' ? isFinished : !isFinished;
    const matchesCompetition = competitionFilter === 'all' || m.competition === competitionFilter;
    return matchesTab && matchesCompetition;
  });

  const visibleMatches = filteredMatches.slice(0, visibleCount);
  const hasMore = filteredMatches.length > visibleCount;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-barca-blue" />
          Calendari de Partits
        </h1>
        <p className="text-sm font-medium text-slate-500 mt-0.5">
          Fes la teva aposta per a cada partit abans que comenci.
        </p>
      </div>

      {/* Pestanyes de navegació grans */}
      <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-200/70">
        <button
          type="button"
          onClick={() => setTab('upcoming')}
          className={`h-10 rounded-xl text-sm font-bold transition-all ${
            tab === 'upcoming'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Propers Partits
        </button>
        <button
          type="button"
          onClick={() => setTab('finished')}
          className={`h-10 rounded-xl text-sm font-bold transition-all ${
            tab === 'finished'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Partits Jugats
        </button>
      </div>

      {/* Filtre de competició */}
      {competitions.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCompetitionFilter('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              competitionFilter === 'all'
                ? 'bg-barca-blue text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Totes les competicions
          </button>
          {competitions.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCompetitionFilter(c)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                competitionFilter === c
                  ? 'bg-barca-blue text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Llistat */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-barca-blue mb-2" />
          <span className="text-sm font-medium">Carregant partits...</span>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
          <p className="font-bold text-base text-slate-800">No hi ha partits en aquest apartat</p>
          <p className="text-xs text-slate-400 mt-1">
            {tab === 'upcoming'
              ? 'No hi ha partits futurs programats actualment.'
              : 'Encara no s’ha jugat cap partit.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleMatches.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              userBet={userBets[m.id]}
              familyBets={familyBets[m.id] || []}
              onBetUpdated={loadData}
            />
          ))}

          {hasMore && (
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="w-full h-11 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all active:scale-95"
            >
              Carregar més partits
            </button>
          )}
        </div>
      )}
    </div>
  );
}
