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
    next: { revalidate: 60 }, // Cache d'1 minut a Next.js
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

    if (m.status === 'FINISHED' && fullTime) {
      goalsBarca = isHome ? fullTime.home : fullTime.away;
      goalsRival = isHome ? fullTime.away : fullTime.home;
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

/**
 * Partits de mostra per a inicialització ràpida (quan no es disposa d'API Key)
 */
export function getSampleBarcaMatches(): NormalizedMatch[] {
  const now = new Date();
  const addDays = (d: number, hours = 21) => {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    date.setHours(hours, 0, 0, 0);
    return date.toISOString();
  };

  const subDays = (d: number, hours = 21) => {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    date.setHours(hours, 0, 0, 0);
    return date.toISOString();
  };

  return [
    {
      external_id: 100001,
      competition: 'La Lliga',
      rival: 'Reial Madrid',
      rival_logo: 'https://crests.football-data.org/86.png',
      match_date: addDays(3, 21),
      home_away: 'HOME',
      goals_barca: null,
      goals_rival: null,
      status: 'scheduled',
    },
    {
      external_id: 100002,
      competition: 'Champions League',
      rival: 'Bayern de Múnic',
      rival_logo: 'https://crests.football-data.org/5.png',
      match_date: addDays(7, 21),
      home_away: 'AWAY',
      goals_barca: null,
      goals_rival: null,
      status: 'scheduled',
    },
    {
      external_id: 100003,
      competition: 'La Lliga',
      rival: 'Atlètic de Madrid',
      rival_logo: 'https://crests.football-data.org/78.png',
      match_date: addDays(11, 16),
      home_away: 'HOME',
      goals_barca: null,
      goals_rival: null,
      status: 'scheduled',
    },
    {
      external_id: 100004,
      competition: 'La Lliga',
      rival: 'Vila-real',
      rival_logo: 'https://crests.football-data.org/94.png',
      match_date: subDays(4, 21),
      home_away: 'AWAY',
      goals_barca: 3,
      goals_rival: 1,
      status: 'finished',
    },
    {
      external_id: 100005,
      competition: 'La Lliga',
      rival: 'Girona FC',
      rival_logo: 'https://crests.football-data.org/298.png',
      match_date: subDays(10, 18),
      home_away: 'HOME',
      goals_barca: 2,
      goals_rival: 0,
      status: 'finished',
    },
  ];
}
