'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Match, Bet, LeaderboardEntry } from '@/types/database';
import { MatchCard } from '@/components/MatchCard';
import { LeaderboardTable } from '@/components/LeaderboardTable';
import { useUser } from '@/context/UserContext';
import { Trophy, Calendar, ChevronRight, Loader2, RefreshCw } from 'lucide-react';

export default function HomePage() {
  const { currentUser } = useUser();
  const [nextMatch, setNextMatch] = useState<Match | null>(null);
  const [userBet, setUserBet] = useState<Bet | null>(null);
  const [nextMatchBets, setNextMatchBets] = useState<Bet[]>([]);
  const [upcomingMatch, setUpcomingMatch] = useState<Match | null>(null);
  const [upcomingUserBet, setUpcomingUserBet] = useState<Bet | null>(null);
  const [upcomingMatchBets, setUpcomingMatchBets] = useState<Bet[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const supabase = createClient();

  const loadData = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);

      // 1. Pròxim partit i classificació en paral·lel (són independents)
      // Fem servir l'inici del dia d'avui (no l'instant actual) com a límit
      // inferior perquè el partit en joc o el que ja ha acabat avui es
      // continuï mostrant; en avançar el dia, el llindar deixa fora el
      // partit d'ahir i apareix automàticament el següent de forma natural.
      const now = new Date();
      const startOfTodayIso = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const [{ data: matches }, { data: leadData }] = await Promise.all([
        supabase
          .from('matches')
          .select('*')
          .gte('match_date', startOfTodayIso)
          .order('match_date', { ascending: true })
          .limit(2),
        supabase.from('leaderboard').select('*').limit(3),
      ]);

      const next = matches && matches.length > 0 ? (matches[0] as Match) : null;
      // Si el partit que es mostra ja ha acabat, mostrem també el següent
      // perquè no calgui esperar a l'endemà per veure'l.
      const upcoming =
        next?.status === 'finished' && matches && matches.length > 1 ? (matches[1] as Match) : null;
      setNextMatch(next);
      setUpcomingMatch(upcoming);
      if (leadData) setLeaderboard(leadData as LeaderboardEntry[]);

      // 2. Porra de l'usuari i porres de tota la família per al pròxim partit
      // (i pel següent, si també el mostrem), tot en paral·lel.
      const [betResult, allBetsResult, upcomingBetResult, upcomingAllBetsResult] = await Promise.all([
        currentUser && next
          ? supabase
              .from('bets')
              .select('*')
              .eq('user_id', currentUser.id)
              .eq('match_id', next.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        next
          ? supabase.from('bets').select('*, profile:profiles(*)').eq('match_id', next.id)
          : Promise.resolve({ data: [] }),
        currentUser && upcoming
          ? supabase
              .from('bets')
              .select('*')
              .eq('user_id', currentUser.id)
              .eq('match_id', upcoming.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        upcoming
          ? supabase.from('bets').select('*, profile:profiles(*)').eq('match_id', upcoming.id)
          : Promise.resolve({ data: [] }),
      ]);

      setUserBet((betResult.data as Bet | null) ?? null);
      setNextMatchBets((allBetsResult.data as Bet[]) || []);
      setUpcomingUserBet((upcomingBetResult.data as Bet | null) ?? null);
      setUpcomingMatchBets((upcomingAllBetsResult.data as Bet[]) || []);
    } catch (err) {
      console.error('Error carregant dades:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, [currentUser?.id]);

  // Punt de l'app que crida l'API real de resultats: consultem
  // football-data.org, actualitzem l'estat/marcador del partit a la base de
  // dades i recarreguem les dades locals. L'estat "En Joc" que es mostra a
  // MatchCard ve directament del que retorni aquí l'API, no d'una estimació
  // basada en l'hora. En mode silenciós (auto-refresc) no mostrem errors ni
  // l'avís de "ja sincronitzat fa menys d'un minut", perquè és esperat.
  const handleRefresh = async (silent = false) => {
    setIsRefreshing(true);
    if (!silent) setRefreshError(null);
    try {
      const res = await fetch('/api/sync-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || `Error del servidor (${res.status})`);
      }

      if (data.skipped && !silent) {
        setRefreshError("Ja s'ha sincronitzat fa menys d'un minut, torna-ho a provar en uns segons.");
      }

      await loadData();
    } catch (err: any) {
      console.error('Error refrescant el marcador:', err);
      if (!silent) setRefreshError(err.message || 'No s\'ha pogut refrescar el marcador.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRefreshRef = useRef(handleRefresh);
  handleRefreshRef.current = handleRefresh;

  // Auto-refresc del marcador en directe: des del xiulet inicial fins a 3,5
  // hores després (marge ampli per cobrir pròrrogues, retards i aturades),
  // consultem l'API cada dos minuts mentre el pròxim partit no consti com a
  // finalitzat. Passat aquest marge deixem de sondejar automàticament
  // (l'usuari sempre pot refrescar a mà).
  //
  // Els mòbils congelen els temporitzadors JS quan la pantalla es bloqueja o
  // l'app passa a segon pla, així que el setInterval pot quedar-se aturat
  // molt més de 2 minuts sense que ningú se n'adoni. Per això, a més del
  // temporitzador, escoltem quan la pestanya torna a fer-se visible per
  // forçar un refresc immediat en comptes d'esperar el proper tick.
  useEffect(() => {
    if (!nextMatch || nextMatch.status === 'finished') return;

    const kickoff = new Date(nextMatch.match_date).getTime();
    const windowEnd = kickoff + 3.5 * 60 * 60_000;

    const tick = () => {
      const now = Date.now();
      if (now >= kickoff && now <= windowEnd) {
        handleRefreshRef.current(true);
      }
    };

    const handleVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };

    tick();
    const interval = setInterval(tick, 2 * 60_000);
    document.addEventListener('visibilitychange', handleVisible);
    window.addEventListener('focus', handleVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisible);
      window.removeEventListener('focus', handleVisible);
    };
  }, [nextMatch?.id, nextMatch?.match_date, nextMatch?.status]);

  return (
    <div className="space-y-4">

      {/* Pròxim Partit del Barça */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-barca-blue" />
            Pròxim Partit
          </h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleRefresh()}
              disabled={isRefreshing || loading}
              aria-label="Refrescar estat i marcador del partit"
              className="flex items-center gap-1 text-xs font-bold text-barca-blue hover:underline disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refrescar
            </button>
            <Link
              href="/partits"
              className="text-xs font-bold text-barca-blue hover:underline flex items-center gap-0.5"
            >
              Veure calendari
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {refreshError && (
          <p className="px-1 text-xs font-semibold text-rose-500">{refreshError}</p>
        )}

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

        {upcomingMatch && (
          <MatchCard
            match={upcomingMatch}
            userBet={upcomingUserBet}
            familyBets={upcomingMatchBets}
            onBetUpdated={loadData}
          />
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
