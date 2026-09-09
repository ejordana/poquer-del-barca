'use client';

import { LeaderboardEntry } from '@/types/database';
import { useUser } from '@/context/UserContext';
import { Trophy, Target, Flame } from 'lucide-react';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
}

export function LeaderboardTable({ entries }: LeaderboardTableProps) {
  const { currentUser } = useUser();

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
        <Trophy className="mx-auto h-10 w-10 text-slate-300 mb-3" />
        <p className="font-bold text-base text-slate-800">Encara no hi ha punts a la classificació</p>
        <p className="text-sm text-slate-400 mt-1">
          Feu les vostres porres i els punts apareixeran aquí quan acabin els partits!
        </p>
      </div>
    );
  }

  // Calculem la posició tenint en compte els empats: si dos jugadors tenen
  // exactament els mateixos punts, plenes i signes, comparteixen posició
  // (ex: dos "1r"), en lloc de desempatar-los artificialment.
  const ranks: number[] = [];
  entries.forEach((item, index) => {
    if (index === 0) {
      ranks.push(1);
      return;
    }
    const prev = entries[index - 1];
    const tied =
      item.total_points === prev.total_points &&
      item.exact_hits === prev.exact_hits &&
      item.outcome_hits === prev.outcome_hits;
    ranks.push(tied ? ranks[index - 1] : index + 1);
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
      <div className="divide-y divide-slate-100">
        {entries.map((item, index) => {
          const isCurrentUser = currentUser?.id === item.user_id || currentUser?.nom === item.nom;
          const rank = ranks[index];

          return (
            <div
              key={item.user_id || item.nom}
              className={`flex items-center justify-between px-3.5 py-2.5 transition-colors ${
                isCurrentUser ? 'bg-blue-50/80' : 'hover:bg-slate-50'
              }`}
            >
              {/* Posició i Nom */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center">
                  {rank === 1 ? (
                    <span className="text-base" title="1r lloc">🥇</span>
                  ) : rank === 2 ? (
                    <span className="text-base" title="2n lloc">🥈</span>
                  ) : rank === 3 ? (
                    <span className="text-base" title="3r lloc">🥉</span>
                  ) : (
                    <span className="text-slate-400 font-semibold text-sm">{rank}</span>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-900 truncate">
                      {item.nom}
                    </span>
                    {isCurrentUser && (
                      <span className="rounded-md bg-barca-blue px-1.5 py-0.5 text-[10px] font-bold text-white">
                        TU
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold">
                    <span className="flex items-center gap-0.5 text-emerald-700">
                      <Target className="w-3 h-3" /> {item.exact_hits}
                    </span>
                    <span className="flex items-center gap-0.5 text-amber-700">
                      <Flame className="w-3 h-3" /> {item.outcome_hits}
                    </span>
                  </div>
                </div>
              </div>

              {/* Punts Totals */}
              <div className="text-right shrink-0 pl-3">
                <span className="text-base font-bold text-slate-900 leading-none">
                  {item.total_points}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                  pts
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
