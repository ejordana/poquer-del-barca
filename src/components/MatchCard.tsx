'use client';

import { useState } from 'react';
import { Match, Bet } from '@/types/database';
import { getPointsBadgeInfo } from '@/lib/scoring';
import { BetModal } from './BetModal';
import { useUser } from '@/context/UserContext';
import { Calendar, MapPin, ChevronDown, ChevronUp, Lock, CheckCircle2, Sparkles } from 'lucide-react';

interface MatchCardProps {
  match: Match;
  userBet?: Bet | null;
  familyBets?: Bet[];
  onBetUpdated?: () => void;
}

export function MatchCard({
  match,
  userBet,
  familyBets = [],
  onBetUpdated,
}: MatchCardProps) {
  const { currentUser, setIsSelectorOpen } = useUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFamilyBets, setShowFamilyBets] = useState(false);

  const isHome = match.home_away === 'HOME';
  const matchDate = new Date(match.match_date);
  const isStarted = matchDate <= new Date() || match.status !== 'scheduled';
  const isFinished = match.status === 'finished';

  // Format natural en català (ex: Diumenge, 15 març a les 21:00h)
  const dateFormatted = new Intl.DateTimeFormat('ca-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(matchDate);

  const timeFormatted = new Intl.DateTimeFormat('ca-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(matchDate);

  const pointsInfo = isFinished && userBet ? getPointsBadgeInfo(userBet.points_earned) : null;

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-slate-300 transition-all">
        {/* Capçalera de competició i data */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-500 mb-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 font-bold text-barca-blue border border-blue-100 text-xs">
              {match.competition}
            </span>
            <span className="flex items-center gap-1 text-slate-400 text-xs">
              <MapPin className="w-3 h-3" />
              {isHome ? 'Camp Nou / Estadi' : 'A domicili'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-bold text-slate-700 capitalize text-xs">
            <Calendar className="w-3.5 h-3.5 text-barca-blue" />
            <span>{dateFormatted}, {timeFormatted}h</span>
          </div>
        </div>

        {/* Enfrontament de clubs */}
        <div className="grid grid-cols-7 items-center gap-2 my-2">
          {/* Equip Local */}
          <div className="col-span-3 flex flex-col items-center text-center">
            <span className="text-sm font-bold text-slate-900 line-clamp-1">
              {isHome ? 'FC Barcelona' : match.rival}
            </span>
          </div>

          {/* Marcador central o VS */}
          <div className="col-span-1 flex flex-col items-center justify-center">
            {isFinished && match.goals_barca !== null && match.goals_rival !== null ? (
              <div className="flex flex-col items-center">
                <span className="text-lg font-bold text-slate-900 tracking-tight">
                  {isHome
                    ? `${match.goals_barca} - ${match.goals_rival}`
                    : `${match.goals_rival} - ${match.goals_barca}`}
                </span>
                <span className="mt-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
                  Final
                </span>
              </div>
            ) : match.status === 'live' ? (
              <div className="flex flex-col items-center">
                <span className="relative flex h-3.5 w-3.5 mb-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500"></span>
                </span>
                <span className="text-xs font-bold text-rose-600 uppercase tracking-widest">
                  Directe
                </span>
              </div>
            ) : (
              <span className="text-sm font-bold text-slate-300">VS</span>
            )}
          </div>

          {/* Equip Visitant */}
          <div className="col-span-3 flex flex-col items-center text-center">
            <span className="text-sm font-bold text-slate-900 line-clamp-1">
              {!isHome ? 'FC Barcelona' : match.rival}
            </span>
          </div>
        </div>

        {/* Zona clara de la Porra */}
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {currentUser ? `Porra de ${currentUser.nom}:` : 'La teva porra:'}
              </span>

              {userBet ? (
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-sm font-bold text-slate-900">
                    {isHome
                      ? `Barça ${userBet.predicted_goals_barca} - ${userBet.predicted_goals_rival} ${match.rival}`
                      : `${match.rival} ${userBet.predicted_goals_rival} - ${userBet.predicted_goals_barca} Barça`}
                  </span>
                  {userBet.is_joker && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700">
                      <Sparkles className="w-3 h-3" />
                      JoQuer
                    </span>
                  )}
                  {pointsInfo && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {pointsInfo.text}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xs text-slate-500 font-semibold italic mt-0.5 block">
                  {isStarted ? 'No vas apostar en aquest partit' : 'Encara no has fet la teva porra'}
                </span>
              )}
            </div>

            {/* Botó per apostar */}
            {currentUser ? (
              !isStarted ? (
                userBet ? (
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="self-start sm:self-center text-xs font-semibold text-barca-blue hover:text-barca-blue-light hover:underline transition-colors py-1"
                  >
                    Canviar porra
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="h-9 px-4 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 bg-barca-blue hover:bg-barca-blue-light text-white"
                  >
                    <span>Fer la meva porra</span>
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  </button>
                )
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 py-1">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Porres Tancades</span>
                </div>
              )
            ) : (
              <button
                type="button"
                onClick={() => setIsSelectorOpen(true)}
                className="h-9 px-4 rounded-xl bg-barca-blue text-white font-bold text-xs shadow-sm hover:brightness-110 active:scale-95"
              >
                Tria el teu nom per apostar
              </button>
            )}
          </div>
        </div>

        {/* Desplegable de les porres dels familiars un cop començat el partit */}
        {isStarted && familyBets.length > 0 && (
          <div className="mt-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowFamilyBets(!showFamilyBets)}
              className="flex items-center justify-between w-full text-sm font-semibold text-slate-700 hover:text-slate-900 py-1 transition-colors"
            >
              <span>Porres de la família ({familyBets.length})</span>
              {showFamilyBets ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>

            {showFamilyBets && (
              <div className="mt-2.5 space-y-2 animate-in fade-in duration-150">
                {familyBets.map((bet) => {
                  const betPoints = isFinished ? getPointsBadgeInfo(bet.points_earned) : null;
                  return (
                    <div
                      key={bet.id}
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold"
                    >
                      <span className="flex items-center gap-1.5 text-slate-900">
                        {bet.profile?.nom || 'Familiar'}
                        {bet.is_joker && <Sparkles className="w-3.5 h-3.5 text-violet-500" />}
                      </span>
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-base text-slate-900">
                          {isHome
                            ? `${bet.predicted_goals_barca} - ${bet.predicted_goals_rival}`
                            : `${bet.predicted_goals_rival} - ${bet.predicted_goals_barca}`}
                        </span>
                        {betPoints && (
                          <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-700">
                            {betPoints.text}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <BetModal
        match={match}
        currentBet={userBet}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => {
          if (onBetUpdated) onBetUpdated();
        }}
      />
    </>
  );
}
