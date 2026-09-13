'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/context/UserContext';
import { Trophy, X } from 'lucide-react';

interface ToastItem {
  id: string;
  points: number;
  resultText: string;
}

const STORAGE_KEY_PREFIX = 'porres_notified_points_';
const POLL_INTERVAL_MS = 30_000;
const TOAST_DURATION_MS = 7_000;

function readNotifiedMap(userId: string): Record<string, number> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + userId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeNotifiedMap(userId: string, map: Record<string, number>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + userId, JSON.stringify(map));
  } catch {
    // Ignorem errors d'emmagatzematge (mode privat, quota plena, etc.)
  }
}

/**
 * Vigila en segon pla les porres de l'usuari actiu i mostra un avís
 * quan es calculen (o recalculen) punts d'un partit finalitzat.
 */
export function PointsNotifier() {
  const { currentUser } = useUser();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const checkingRef = useRef(false);

  useEffect(() => {
    if (!currentUser) return;
    const supabase = createClient();

    const checkNewPoints = async () => {
      if (checkingRef.current) return;
      checkingRef.current = true;

      try {
        const { data, error } = await supabase
          .from('bets')
          .select(
            'id, points_earned, match:matches(rival, home_away, goals_barca, goals_rival)'
          )
          .eq('user_id', currentUser.id)
          .not('points_earned', 'is', null);

        if (error || !data) return;

        // La primera vegada que aquest usuari obre l'app en aquest dispositiu no hi ha
        // res desat encara: guardem l'estat actual com a "ja vist" sense generar avisos,
        // per no bombardejar amb tot l'historial de cop.
        const isFirstRun = readNotifiedMap(currentUser.id) === null;
        const notified = readNotifiedMap(currentUser.id) || {};
        const newToasts: ToastItem[] = [];
        let changed = false;

        for (const bet of data as any[]) {
          const points = bet.points_earned as number;
          if (notified[bet.id] === points) continue;

          notified[bet.id] = points;
          changed = true;

          if (isFirstRun) continue;

          const m = bet.match;
          if (!m) continue;

          const resultText =
            m.home_away === 'HOME'
              ? `Barça ${m.goals_barca} - ${m.goals_rival} ${m.rival}`
              : `${m.rival} ${m.goals_rival} - ${m.goals_barca} Barça`;

          newToasts.push({ id: bet.id, points, resultText });
        }

        if (changed) writeNotifiedMap(currentUser.id, notified);

        if (newToasts.length > 0) {
          setToasts((prev) => [...prev, ...newToasts]);
          newToasts.forEach((t) => {
            setTimeout(() => {
              setToasts((prev) => prev.filter((x) => x.id !== t.id));
            }, TOAST_DURATION_MS);
          });
        }
      } finally {
        checkingRef.current = false;
      }
    };

    checkNewPoints();
    const interval = setInterval(checkNewPoints, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-24 inset-x-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto w-full max-w-sm flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white shadow-lg p-3.5 animate-in slide-in-from-top-2 fade-in duration-300"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900">
              Has guanyat {t.points} {t.points === 1 ? 'punt' : 'punts'}!
            </p>
            <p className="text-xs font-semibold text-slate-500 line-clamp-1">{t.resultText}</p>
          </div>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            aria-label="Tancar avís"
            className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
