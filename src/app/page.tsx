'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Match, Bet, LeaderboardEntry } from '@/types/database';
import { MatchCard } from '@/components/MatchCard';
import { LeaderboardTable } from '@/components/LeaderboardTable';
import { useUser } from '@/context/UserContext';
import { Trophy, Calendar, ChevronRight, Loader2 } from 'lucide-react';

export default function HomePage() {
  const { currentUser } = useUser();
  const [nextMatch, setNextMatch] = useState<Match | null>(null);
  const [userBet, setUserBet] = useState<Bet | null>(null);
  const [nextMatchBets, setNextMatchBets] = useState<Bet[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const loadData = async () => {
    try {
      setLoading(true);

      // 1. Pròxim partit
      const nowIso = new Date().toISOString();
      const { data: matches } = await supabase
        .from('matches')
        .select('*')
        .gte('match_date', nowIso)
        .order('match_date', { ascending: true })
        .limit(1);

      const next = matches && matches.length > 0 ? (matches[0] as Match) : null;
      setNextMatch(next);

      // 2. Porra de l'usuari per al pròxim partit
      if (currentUser && next) {
        const { data: bet } = await supabase
          .from('bets')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('match_id', next.id)
          .maybeSingle();

        setUserBet(bet as Bet | null);
      } else {
        setUserBet(null);
      }

      // 3. Totes les porres del pròxim partit (per veure qui ha apostat)
      if (next) {
        const { data: allBets } = await supabase
          .from('bets')
          .select('*, profile:profiles(*)')
          .eq('match_id', next.id);

        setNextMatchBets((allBets as Bet[]) || []);
      } else {
        setNextMatchBets([]);
      }

      // 4. Classificació
      const { data: leadData } = await supabase
        .from('leaderboard')
        .select('*')
        .limit(3);

      if (leadData) setLeaderboard(leadData as LeaderboardEntry[]);
    } catch (err) {
      console.error('Error carregant dades:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser?.id]);

  return (
    <div className="space-y-4">

      {/* Pròxim Partit del Barça */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-barca-blue" />
            Pròxim Partit
          </h2>
          <Link
            href="/partits"
            className="text-xs font-bold text-barca-blue hover:underline flex items-center gap-0.5"
          >
            Veure calendari
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center rounded-2xl bg-white border border-slate-200">
            <Loader2 className="w-6 h-6 animate-spin text-barca-blue" />
          </div>
        ) : nextMatch ? (
          <MatchCard
            match={nextMatch}
            userBet={userBet}
            familyBets={nextMatchBets}
            onBetUpdated={loadData}
          />
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
            <p className="font-bold text-base text-slate-800">No hi ha cap partit programat</p>
            <p className="text-xs text-slate-400 mt-1">
              Pots carregar els partits des de la pestanya <strong>Admin</strong>.
            </p>
          </div>
        )}
      </section>

      {/* Rànquing Destacat */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Classificació
          </h2>
          <Link
            href="/classificacio"
            className="text-xs font-bold text-barca-blue hover:underline flex items-center gap-0.5"
          >
            Veure tots
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <LeaderboardTable entries={leaderboard} />
      </section>
    </div>
  );
}
