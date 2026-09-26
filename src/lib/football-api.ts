import { HomeAway, MatchStatus } from '@/types/database';

export interface NormalizedMatch {
  external_id: number;
  competition: string;
  rival: string;
  rival_logo: string | null;
  match_date: string;
  home_away: HomeAway;
  goals_barca: number | null;
  goals_rival: number | null;
  status: MatchStatus;
}

const BARCA_TEAM_ID = 81; // FC Barcelona a football-data.org

/**
 * Tradueix i neteja els noms de competició al català
 */
function normalizeCompetitionName(rawName: string): string {
  if (/primera division|la liga/i.test(rawName)) return 'La Lliga';
  if (/champions league/i.test(rawName)) return 'Champions League';
  if (/copa del rey/i.test(rawName)) return 'Copa del Rei';
  if (/supercopa/i.test(rawName)) return "Supercopa d'Espanya";
  return rawName;
}

/**
 * Mapeja l'estat del partit de football-data.org als estats de la nostra BD
 */
function normalizeStatus(rawStatus: string): MatchStatus {
  switch (rawStatus.toUpperCase()) {
    case 'FINISHED':
    case 'AWARDED':
      return 'finished';
    case 'IN_PLAY':
    case 'PAUSED':
      return 'live';
    case 'POSTPONED':
    case 'CANCELLED':
    case 'SUSPENDED':
      return 'postponed';
    case 'SCHEDULED':
    case 'TIMED':
    default:
      return 'scheduled';
  }
}

/**
 * Consulta l'API de football-data.org per obtenir els partits del FC Barcelona
 */
export async function fetchBarcaMatchesFromApi(apiKey: string): Promise<NormalizedMatch[]> {
  const url = `https://api.football-data.org/v4/teams/${BARCA_TEAM_ID}/matches`;

  const res = await fetch(url, {
    headers: {
      'X-Auth-Token': apiKey,
    },
    cache: 'no-store', // El llindar d'1 minut ja el controlem via sync_state
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error en consultar football-data.org (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const rawMatches = data.matches || [];

  return rawMatches.map((m: any): NormalizedMatch => {
    const isHome = m.homeTeam?.id === BARCA_TEAM_ID || /barcelona/i.test(m.homeTeam?.name || '');
    const rivalTeam = isHome ? m.awayTeam : m.homeTeam;
    const homeAway: HomeAway = isHome ? 'HOME' : 'AWAY';

    const fullTime = m.score?.fullTime;
    let goalsBarca: number | null = null;
    let goalsRival: number | null = null;

    const halfTime = m.score?.halfTime;
    const isLiveOrFinished = m.status === 'FINISHED' || m.status === 'IN_PLAY' || m.status === 'PAUSED';
    const currentScore = fullTime?.home !== null && fullTime?.home !== undefined ? fullTime : halfTime;

    if (isLiveOrFinished && currentScore) {
      goalsBarca = isHome ? currentScore.home : currentScore.away;
      goalsRival = isHome ? currentScore.away : currentScore.home;
    }

    return {
      external_id: m.id,
      competition: normalizeCompetitionName(m.competition?.name || 'Futbol'),
      rival: rivalTeam?.shortName || rivalTeam?.name || 'Rival',
      rival_logo: rivalTeam?.crest || null,
      match_date: m.utcDate,
      home_away: homeAway,
      goals_barca: goalsBarca,
      goals_rival: goalsRival,
      status: normalizeStatus(m.status),
    };
  });
}
