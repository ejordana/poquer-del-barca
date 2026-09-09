'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Match, Bet } from '@/types/database';
import { useUser } from '@/context/UserContext';
import { SCORING_RULES } from '@/lib/scoring';
import { X, Check, AlertCircle, Sparkles } from 'lucide-react';

interface BetModalProps {
  match: Match;
  currentBet?: Bet | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function BetModal({ match, currentBet, isOpen, onClose, onSaved }: BetModalProps) {
  const { currentUser, setIsSelectorOpen } = useUser();
  const [goalsBarca, setGoalsBarca] = useState<number>(currentBet?.predicted_goals_barca ?? 2);
  const [goalsRival, setGoalsRival] = useState<number>(currentBet?.predicted_goals_rival ?? 1);
  const [isJoker, setIsJoker] = useState<boolean>(currentBet?.is_joker ?? false);
  const [jokerUsedElsewhere, setJokerUsedElsewhere] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Comptar quantes vegades ja s'ha fet servir el comodí JoQuer en altres partits
  useEffect(() => {
    if (!isOpen || !currentUser) return;

    (async () => {
      const { count } = await supabase
        .from('bets')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', currentUser.id)
        .eq('is_joker', true)
        .neq('match_id', match.id);

      setJokerUsedElsewhere(count || 0);
    })();
  }, [isOpen, currentUser?.id, match.id]);

  if (!isOpen) return null;

  const isHome = match.home_away === 'HOME';
  const matchDate = new Date(match.match_date);
  const isExpired = matchDate <= new Date() || match.status !== 'scheduled';
  const jokerRemaining = Math.max(0, SCORING_RULES.JOKER_MAX_USES - jokerUsedElsewhere);
  const canUseJoker = isJoker || jokerRemaining > 0;

  const handleSave = async () => {
    if (!currentUser) {
      setIsSelectorOpen(true);
      return;
    }

    if (isExpired) {
      setError('Aquest partit ja ha començat. No es poden fer més canvis.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (currentBet?.id) {
        // Actualitzar porra existent
        const { error: updateErr } = await supabase
          .from('bets')
          .update({
            predicted_goals_barca: goalsBarca,
            predicted_goals_rival: goalsRival,
            is_joker: isJoker,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentBet.id);

        if (updateErr) throw updateErr;
      } else {
        // Crear nova porra
        const { error: insertErr } = await supabase
          .from('bets')
          .insert({
            user_id: currentUser.id,
            match_id: match.id,
            predicted_goals_barca: goalsBarca,
            predicted_goals_rival: goalsRival,
            is_joker: isJoker,
          });

        if (insertErr) throw insertErr;
      }

      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Error desant la porra:', err);
      setError(err.message || 'No s’ha pogut desar la porra. Torna-ho a provar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-4 sm:p-5 shadow-2xl border border-slate-200">
        {/* Botó tancar */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Capçalera */}
        <div className="text-center mb-6">
          <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-barca-blue font-bold text-xs mb-2">
            {match.competition}
          </span>
          <h3 className="text-base font-bold text-slate-900">
            {currentBet ? 'Canvia la teva Porra' : 'Fes la teva Porra'}
          </h3>
          <p className="text-sm font-semibold text-slate-500 mt-0.5">
            {isHome ? `FC Barcelona vs ${match.rival}` : `${match.rival} vs FC Barcelona`}
          </p>

          {currentUser && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
              <span>Aposta per:</span>
              <strong className="text-barca-blue">{currentUser.nom}</strong>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Selectors de gols amb botons gegants i molt llegibles */}
        <div className="flex items-center justify-center gap-3 my-6">
          {/* Equip Local */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <span className="text-sm font-bold text-slate-800 text-center line-clamp-1">
              {isHome ? 'Barça' : match.rival}
            </span>
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isHome) setGoalsBarca(goalsBarca + 1);
                  else setGoalsRival(goalsRival + 1);
                }}
                disabled={loading || isExpired}
                className="w-11 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-900 font-bold text-lg flex items-center justify-center transition-all border border-slate-300 shadow-xs"
              >
                +
              </button>
              <span className="text-2xl font-bold text-slate-900 my-1">
                {isHome ? goalsBarca : goalsRival}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (isHome) setGoalsBarca(Math.max(0, goalsBarca - 1));
                  else setGoalsRival(Math.max(0, goalsRival - 1));
                }}
                disabled={loading || isExpired}
                className="w-11 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-900 font-bold text-lg flex items-center justify-center transition-all border border-slate-300 shadow-xs"
              >
                –
              </button>
            </div>
          </div>

          <span className="text-xl font-bold text-slate-400 self-center">:</span>

          {/* Equip Visitant */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <span className="text-sm font-bold text-slate-800 text-center line-clamp-1">
              {isHome ? match.rival : 'Barça'}
            </span>
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isHome) setGoalsRival(goalsRival + 1);
                  else setGoalsBarca(goalsBarca + 1);
                }}
                disabled={loading || isExpired}
                className="w-11 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-900 font-bold text-lg flex items-center justify-center transition-all border border-slate-300 shadow-xs"
              >
                +
              </button>
              <span className="text-2xl font-bold text-slate-900 my-1">
                {isHome ? goalsRival : goalsBarca}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (isHome) setGoalsRival(Math.max(0, goalsRival - 1));
                  else setGoalsBarca(Math.max(0, goalsBarca - 1));
                }}
                disabled={loading || isExpired}
                className="w-11 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-900 font-bold text-lg flex items-center justify-center transition-all border border-slate-300 shadow-xs"
              >
                –
              </button>
            </div>
          </div>
        </div>

        {/* Consell de punts clar */}
        <p className="text-xs text-center text-slate-500 font-medium mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          Marcador exacte = <strong>3 punts</strong> | Encerta guanyador o empat = <strong>1 punt</strong>
        </p>

        {/* Comodí JoQuer */}
        <label
          className={`flex items-start gap-3 p-3.5 rounded-2xl border mb-6 transition-all ${
            isJoker
              ? 'bg-violet-50 border-violet-300'
              : canUseJoker
              ? 'bg-slate-50 border-slate-200 cursor-pointer hover:border-violet-200'
              : 'bg-slate-50 border-slate-200 opacity-50'
          }`}
        >
          <input
            type="checkbox"
            checked={isJoker}
            disabled={loading || isExpired || !canUseJoker}
            onChange={(e) => setIsJoker(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded text-violet-600 focus:ring-violet-500 border-slate-300"
          />
          <div className="min-w-0">
            <span className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
              <Sparkles className="w-4 h-4 text-violet-500" />
              Comodí JoQuer
            </span>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Si encertes el marcador exacte amb el JoQuer actiu, sumes{' '}
              <strong>3 punts + els gols totals del partit</strong>.{' '}
              {canUseJoker ? (
                <>Et queden <strong>{jokerRemaining}</strong> de {SCORING_RULES.JOKER_MAX_USES} usos aquesta temporada.</>
              ) : (
                <>Ja has esgotat els {SCORING_RULES.JOKER_MAX_USES} usos d'aquesta temporada.</>
              )}
            </p>
          </div>
        </label>

        {/* Botó gran d'acció */}
        <button
          onClick={handleSave}
          disabled={loading || isExpired}
          className="w-full h-11 rounded-2xl bg-barca-blue hover:bg-barca-blue-light text-white font-semibold text-base shadow-lg shadow-barca-blue/20 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              <Check className="w-5 h-5 stroke-[3]" />
              <span>GUARDAR LA MEVA PORRA</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
