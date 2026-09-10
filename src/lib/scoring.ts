/**
 * Sistema de Puntuació de "Porres del Barça"
 * Aquests valors són fàcilment modificables.
 */
export const SCORING_RULES = {
  EXACT_SCORE: 3,     // Encert exacte del resultat (ex: 2-1 vs 2-1)
  CORRECT_OUTCOME: 1, // Encert de guanyador o empat (ex: 3-0 vs 2-1, o 1-1 vs 2-2)
  MISS: 0,            // Fallada total
  JOKER_MAX_USES: 3,  // Cops que es pot fer servir el comodí JoQuer per temporada
} as const;

export type MatchOutcome = 'BARCA_WIN' | 'DRAW' | 'BARCA_LOSS';

/**
 * Retorna el signe o desenllaç d'un partit segons els gols
 */
export function getMatchOutcome(goalsBarca: number, goalsRival: number): MatchOutcome {
  if (goalsBarca > goalsRival) return 'BARCA_WIN';
  if (goalsBarca < goalsRival) return 'BARCA_LOSS';
  return 'DRAW';
}

/**
 * Calcula els punts obtinguts per una porra donat el resultat real
 */
export function calculateBetPoints(
  predictedBarca: number,
  predictedRival: number,
  realBarca: number,
  realRival: number
): number {
  // 1. Marcador exacte -> 3 punts
  if (predictedBarca === realBarca && predictedRival === realRival) {
    return SCORING_RULES.EXACT_SCORE;
  }

  // 2. Encert del guanyador o empat -> 1 punt
  const predictedOutcome = getMatchOutcome(predictedBarca, predictedRival);
  const realOutcome = getMatchOutcome(realBarca, realRival);

  if (predictedOutcome === realOutcome) {
    return SCORING_RULES.CORRECT_OUTCOME;
  }

  // 3. Fallada -> 0 punts
  return SCORING_RULES.MISS;
}

/**
 * Retorna una descripció textual en català del premi de punts
 */
export function getPointsBadgeInfo(points: number | null) {
  if (points === null) return { text: 'Pendent', color: 'bg-slate-700 text-slate-300' };
  if (points > SCORING_RULES.EXACT_SCORE) {
    return { text: `+${points} pts (JoQuer! 🃏)`, color: 'bg-violet-500/20 text-violet-300 border border-violet-500/30' };
  }
  if (points === SCORING_RULES.EXACT_SCORE) {
    return { text: `+${points} pts (Plena! 🍖)`, color: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' };
  }
  if (points === SCORING_RULES.CORRECT_OUTCOME) {
    return { text: `+${points} pt (Signe)`, color: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' };
  }
  return { text: '0 pts', color: 'bg-rose-500/10 text-rose-400 border border-rose-500/20' };
}
