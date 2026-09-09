'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Match, Bet } from '@/types/database';
import { MatchCard } from '@/components/MatchCard';
import { useUser } from '@/context/UserContext';
import { Calendar, Loader2 } from 'lucide-react';

export default function PartitsPage() {
  const { currentUser } = useUser();
  const [matches, setMatches] = useState<Match[]>([]);
  const [userBets, setUserBets] = useState<Record<string, Bet>>({});
  const [familyBets, setFamilyBets] = useState<Record<string, Bet[]>>({});
  const [tab, setTab] = useState<'upcoming' | 'finished'>('upcoming');
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const loadData = async () => {
    try {
      setLoading(true);

      // Obtenir tots els partits
      const { data: matchesData } = await supabase
        .from('matches')
        .select('*')
        .order('match_date', { ascending: tab === 'upcoming' });

      const allMatches = (matchesData as Match[]) || [];
      setMatches(allMatches);

      // Obtenir porres de l'usuari actiu
      if (currentUser && allMatches.length > 0) {
        const { data: betsData } = await supabase
          .from('bets')
          .select('*')
          .eq('user_id', currentUser.id);

        const betsMap: Record<string, Bet> = {};
        betsData?.forEach((b: any) => {
          betsMap[b.match_id] = b;
        });
        setUserBets(betsMap);

        // Obtenir porres de la família per als partits ja iniciats
        const startedMatchIds = allMatches
          .filter((m) => new Date(m.match_date) <= new Date() || m.status !== 'scheduled')
          .map((m) => m.id);

        if (startedMatchIds.length > 0) {
          const { data: allFamilyBets } = await supabase
            .from('bets')
            .select('*, profile:profiles(*)')
            .in('match_id', startedMatchIds);

          const famMap: Record<string, Bet[]> = {};
          allFamilyBets?.forEach((b: any) => {
            if (!famMap[b.match_id]) famMap[b.match_id] = [];
            famMap[b.match_id].push(b);
          });
          setFamilyBets(famMap);
        }
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

  const filteredMatches = matches.filter((m) => {
    const isFinished = m.status === 'finished';
    return tab === 'finished' ? isFinished : !isFinished;
  });

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
          {filteredMatches.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              userBet={userBets[m.id]}
              familyBets={familyBets[m.id] || []}
              onBetUpdated={loadData}
            />
          ))}
        </div>
      )}
    </div>
  );
}
