export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed';
export type HomeAway = 'HOME' | 'AWAY';

export const FAMILY_MEMBERS = [
  'Elisenda',
  'Francesc',
  'Montserrat',
  'Marta',
  'Anna Maria',
  'Sigfrid',
  'Anna',
  'Xavier',
  'Elisabet',
] as const;

export type FamilyMemberName = typeof FAMILY_MEMBERS[number];

export interface Profile {
  id: string;
  nom: string;
  avatar_color?: string;
  avatar_url?: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  external_id: number | null;
  competition: string;
  rival: string;
  rival_logo: string | null;
  match_date: string;
  home_away: HomeAway;
  goals_barca: number | null;
  goals_rival: number | null;
  status: MatchStatus;
  created_at: string;
  updated_at: string;
}

export interface Bet {
  id: string;
  user_id: string;
  match_id: string;
  predicted_goals_barca: number;
  predicted_goals_rival: number;
  points_earned: number | null;
  is_joker: boolean;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface LeaderboardEntry {
  user_id: string;
  nom: string;
  avatar_color?: string;
  avatar_url?: string | null;
  is_admin: boolean;
  total_points: number;
  bets_count: number;
  exact_hits: number;
  outcome_hits: number;
  misses: number;
}
