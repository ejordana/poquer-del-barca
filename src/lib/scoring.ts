/**
 * Sistema de Puntuació de "Porres del Barça"
 * Aquests valors són fàcilment modificables.
 */
export const SCORING_RULES = {
  EXACT_SCORE: 3,     // Encert exacte del resultat (ex: 2-1 vs 2-1)
  GOAL_DIFF: 2,       // Encert del signe I de la diferència de gols (ex: 2-0 vs 3-1, o 1-1 vs 2-2)
  CORRECT_OUTCOME: 1, // Encert només del signe: guanyador/empat/derrota (ex: 3-0 vs 1-0)
  MISS: 0,            // Fallada total
  JOKER_MAX_USES: 3,  // Cops que es pot fer servir el comodí JoQuer per temporada
} as const;

export type MatchOutcome = 'BARCA_WIN' | 'DRAW' | 'BARCA_LOSS';

/**
 * Criteris mínims per ordenar i classificar una entrada de la classificació.
 */
export interface RankableEntry {
  total_points: number;
  exact_hits: number;
  outcome_hits: number;
  nom: string;
}

/**
 * Ordena una llista d'entrades segons els mateixos criteris que la vista
 * `leaderboard`: punts, després plenes, després signes i, finalment, nom.
 */
export function sortLeaderboard<T extends RankableEntry>(entries: T[]): T[] {
  return [...entries].sort(
    (a, b) =>
      b.total_points - a.total_points ||
      b.exact_hits - a.exact_hits ||
      b.outcome_hits - a.outcome_hits ||
      a.nom.localeCompare(b.nom)
  );
}

/**
 * A partir d'una llista JA ordenada, calcula la posició de cada entrada
 * tenint en compte els empats (dos jugadors amb els mateixos punts, plenes
 * i signes comparteixen posició).
 */
export function computeRanks(sorted: RankableEntry[]): number[] {
  const ranks: number[] = [];
  sorted.forEach((item, index) => {
    if (index === 0) {
      ranks.push(1);
      return;
    }
    const prev = sorted[index - 1];
    const tied =
      item.total_points === prev.total_points &&
      item.exact_hits === prev.exact_hits &&
      item.outcome_hits === prev.outcome_hits;
    ranks.push(tied ? ranks[index - 1] : index + 1);
  });
  return ranks;
}

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

  // 2. Encert del signe I de la diferència de gols -> 2 punts.
  //    Si les diferències coincideixen, el signe també coincideix per força
  //    (inclou els empats amb marcador diferent, on la diferència és 0 = 0).
  if (predictedBarca - predictedRival === realBarca - realRival) {
    return SCORING_RULES.GOAL_DIFF;
  }

  // 3. Encert només del signe (guanyador/empat/derrota) -> 1 punt
  const predictedOutcome = getMatchOutcome(predictedBarca, predictedRival);
  const realOutcome = getMatchOutcome(realBarca, realRival);

  if (predictedOutcome === realOutcome) {
    return SCORING_RULES.CORRECT_OUTCOME;
  }

  // 4. Fallada -> 0 punts
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
  if (points === SCORING_RULES.GOAL_DIFF) {
    return { text: `+${points} pts (Diferència)`, color: 'bg-sky-500/20 text-sky-300 border border-sky-500/30' };
  }
  if (points === SCORING_RULES.CORRECT_OUTCOME) {
    return { text: `+${points} pt (Signe)`, color: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' };
  }
  return { text: '0 pts', color: 'bg-rose-500/10 text-rose-400 border border-rose-500/20' };
}
