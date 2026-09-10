'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { LeaderboardEntry } from '@/types/database';
import { LeaderboardTable } from '@/components/LeaderboardTable';
import { SCORING_RULES, sortLeaderboard, computeRanks } from '@/lib/scoring';
import { Trophy, HelpCircle, Loader2, Ham } from 'lucide-react';

export default function ClassificacioPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [previousRanks, setPreviousRanks] = useState<Record<string, number> | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const loadLeaderboard = async () => {
    try {
      const { data } = await supabase
        .from('leaderboard')
        .select('*');

      const entriesData = (data as LeaderboardEntry[]) || [];
      setEntries(entriesData);

      // Calcular el moviment respecte a l'última jornada: reconstruïm la
      // classificació TAL COM ERA abans de l'últim partit finalitzat, restant
      // els punts que aquell partit va aportar a cada usuari.
      const { data: finished } = await supabase
        .from('matches')
        .select('id')
        .eq('status', 'finished')
        .order('match_date', { ascending: false });

      // Cal com a mínim 2 partits finalitzats perquè el "abans" sigui significatiu.
      if (entriesData.length > 0 && finished && finished.length >= 2) {
        const lastMatchId = finished[0].id;
        const { data: lastBets } = await supabase
          .from('bets')
          .select('user_id, points_earned')
          .eq('match_id', lastMatchId);

        const lastPointsByUser: Record<string, number> = {};
        (lastBets || []).forEach((b: any) => {
          if (b.points_earned !== null) lastPointsByUser[b.user_id] = b.points_earned;
        });

        const previousEntries = entriesData.map((e) => {
          const p = lastPointsByUser[e.user_id] ?? null;
          return {
            ...e,
            total_points: e.total_points - (p ?? 0),
            exact_hits: e.exact_hits - (p !== null && p >= SCORING_RULES.EXACT_SCORE ? 1 : 0),
            outcome_hits: e.outcome_hits - (p === SCORING_RULES.CORRECT_OUTCOME ? 1 : 0),
          };
        });

        const sortedPrev = sortLeaderboard(previousEntries);
        const prevRankArr = computeRanks(sortedPrev);
        const prevRanks: Record<string, number> = {};
        sortedPrev.forEach((e, i) => {
          prevRanks[e.user_id] = prevRankArr[i];
        });
        setPreviousRanks(prevRanks);
      } else {
        setPreviousRanks(undefined);
      }
    } catch (err) {
      console.error('Error carregant la classificació:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();

    // Supabase Realtime
    const channel = supabase
      .channel('realtime_leaderboard_light')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bets' },
        () => loadLeaderboard()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => loadLeaderboard()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Capçalera */}
      <div>
        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-500" />
          Classificació
        </h1>
        <p className="text-sm font-medium text-slate-500 mt-0.5">
          Qui va primer a la lliga de porres del Barça?
        </p>
      </div>

      {/* Taula de Classificació */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-barca-blue mb-2" />
          <span className="text-sm font-medium">Actualitzant classificació...</span>
        </div>
      ) : (
        <LeaderboardTable entries={entries} previousRanks={previousRanks} />
      )}

      {/* Targeta senzilla de com sumen els punts */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-barca-blue" />
          Com es guanyen els punts?
        </h3>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1">
                <Ham className="w-3.5 h-3.5 text-emerald-700" />
                Marcador Exacte
              </span>
              <span className="font-bold text-emerald-700 text-sm">+{SCORING_RULES.EXACT_SCORE} punts</span>
            </div>
            <p className="text-xs text-slate-600">
              Encertes exactament els gols (ex: poses 3-1 i queda 3-1). Fer el ple = pernil! 🍖
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-100">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-900 text-xs">Signe + Diferència</span>
              <span className="font-bold text-sky-700 text-sm">+{SCORING_RULES.GOAL_DIFF} punts</span>
            </div>
            <p className="text-xs text-slate-600">
              Encertes el resultat i la diferència de gols, però no el marcador (ex: poses 2-0 i acaba 3-1).
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-100">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-900 text-xs">Signe (1X2)</span>
              <span className="font-bold text-amber-700 text-sm">+{SCORING_RULES.CORRECT_OUTCOME} punt</span>
            </div>
            <p className="text-xs text-slate-600">
              Encertes només qui guanya o si empaten (ex: poses 2-0 i acaba 1-0).
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-900 text-xs">Fallada</span>
              <span className="font-bold text-slate-500 text-sm">{SCORING_RULES.MISS} punts</span>
            </div>
            <p className="text-xs text-slate-600">
              No encertes ni qui guanya ni els gols.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-violet-50 border border-violet-100">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-slate-900 text-xs">🃏 Comodí JoQuer</span>
            <span className="font-bold text-violet-700 text-sm">
              +{SCORING_RULES.EXACT_SCORE} + gols del partit
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Activa el JoQuer a la teva porra (màxim {SCORING_RULES.JOKER_MAX_USES} cops per temporada). Si encertes el
            marcador exacte, a més dels {SCORING_RULES.EXACT_SCORE} punts sumes tants punts extra com gols totals
            hi hagi hagut al partit.
          </p>
        </div>
      </div>
    </div>
  );
}
