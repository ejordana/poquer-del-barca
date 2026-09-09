-- ====================================================================
-- POQUER DEL BARÇA - ESQUEMA DE BASE DE DADES (SUPABASE / POSTGRESQL)
-- Versió simplificada per a ús familiar (9 membres predefinits)
-- ====================================================================

-- 1. TAULA: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT UNIQUE NOT NULL,
  avatar_color TEXT DEFAULT '#004D98',
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Si la taula ja existia de la primera versió amb correus, l'adaptem al model familiar:
ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_color TEXT DEFAULT '#004D98';

-- Inserció automàtica dels 9 membres de la família
INSERT INTO public.profiles (nom, avatar_color, is_admin) VALUES
  ('Elisenda', '#A50044', FALSE),
  ('Francesc', '#004D98', FALSE),
  ('Montserrat', '#A50044', FALSE),
  ('Marta', '#D97706', FALSE),
  ('Anna Maria', '#A50044', FALSE),
  ('Sigfrid', '#004D98', FALSE),
  ('Anna', '#D97706', FALSE),
  ('Xavier', '#004D98', TRUE),  -- Administrador per defecte
  ('Elisabet', '#A50044', FALSE)
ON CONFLICT (nom) DO UPDATE SET is_admin = EXCLUDED.is_admin;

-- 2. TAULA: matches
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id INTEGER UNIQUE, -- ID opcional de football-data.org
  competition TEXT NOT NULL,  -- 'La Lliga', 'Champions League', 'Copa del Rei', etc.
  rival TEXT NOT NULL,
  rival_logo TEXT,
  match_date TIMESTAMPTZ NOT NULL,
  home_away TEXT NOT NULL CHECK (home_away IN ('HOME', 'AWAY')),
  goals_barca INTEGER CHECK (goals_barca >= 0),
  goals_rival INTEGER CHECK (goals_rival >= 0),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'finished', 'postponed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_date ON public.matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);

-- 3. TAULA: bets
CREATE TABLE IF NOT EXISTS public.bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  predicted_goals_barca INTEGER NOT NULL CHECK (predicted_goals_barca >= 0),
  predicted_goals_rival INTEGER NOT NULL CHECK (predicted_goals_rival >= 0),
  points_earned INTEGER, -- NULL fins que el partit estigui acabat
  is_joker BOOLEAN NOT NULL DEFAULT FALSE, -- Comodí "JoQuer" (màx. 3 cops per jugador)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_match UNIQUE (user_id, match_id)
);

ALTER TABLE public.bets ADD COLUMN IF NOT EXISTS is_joker BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_bets_user ON public.bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_match ON public.bets(match_id);

-- Límit de 3 usos del comodí JoQuer per jugador (a tota la temporada)
CREATE OR REPLACE FUNCTION public.check_joker_limit()
RETURNS TRIGGER AS $$
DECLARE
  joker_count INTEGER;
BEGIN
  IF NEW.is_joker THEN
    SELECT COUNT(*) INTO joker_count
    FROM public.bets
    WHERE user_id = NEW.user_id AND is_joker = TRUE AND id <> NEW.id;

    IF joker_count >= 3 THEN
      RAISE EXCEPTION 'Ja has fet servir el comodí JoQuer 3 vegades aquesta temporada.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_bet_joker_check ON public.bets;
CREATE TRIGGER on_bet_joker_check
  BEFORE INSERT OR UPDATE OF is_joker ON public.bets
  FOR EACH ROW EXECUTE FUNCTION public.check_joker_limit();

-- 4. FUNCIÓ DE CÀLCUL DE PUNTS
-- 3 punts: marcador exacte
-- 1 punt: encert de guanyador o empat (signe)
-- 0 punts: error
CREATE OR REPLACE FUNCTION public.calculate_match_points(target_match_id UUID)
RETURNS VOID AS $$
DECLARE
  m_goals_barca INTEGER;
  m_goals_rival INTEGER;
  m_status TEXT;
  exact_pts INTEGER := 3;
  outcome_pts INTEGER := 1;
  miss_pts INTEGER := 0;
BEGIN
  -- Obtenir resultat del partit
  SELECT goals_barca, goals_rival, status
  INTO m_goals_barca, m_goals_rival, m_status
  FROM public.matches
  WHERE id = target_match_id;

  IF m_status <> 'finished' OR m_goals_barca IS NULL OR m_goals_rival IS NULL THEN
    UPDATE public.bets
    SET points_earned = NULL, updated_at = NOW()
    WHERE match_id = target_match_id;
    RETURN;
  END IF;

  -- Actualitzar punts de totes les porres d'aquest partit
  UPDATE public.bets
  SET points_earned = CASE
    -- 1. Marcador exacte (3 punts, o 3 + gols totals del partit si es juga el comodí JoQuer)
    WHEN predicted_goals_barca = m_goals_barca AND predicted_goals_rival = m_goals_rival THEN
      exact_pts + (CASE WHEN is_joker THEN (m_goals_barca + m_goals_rival) ELSE 0 END)
    -- 2. Encert de victòria del Barça (1 punt)
    WHEN (predicted_goals_barca > predicted_goals_rival) AND (m_goals_barca > m_goals_rival) THEN outcome_pts
    -- 3. Encert d'empat (1 punt)
    WHEN (predicted_goals_barca = predicted_goals_rival) AND (m_goals_barca = m_goals_rival) THEN outcome_pts
    -- 4. Encert de derrota del Barça (1 punt)
    WHEN (predicted_goals_barca < predicted_goals_rival) AND (m_goals_barca < m_goals_rival) THEN outcome_pts
    -- 5. Fallada (0 punts)
    ELSE miss_pts
  END,
  updated_at = NOW()
  WHERE match_id = target_match_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger quan s'actualitza el resultat d'un partit
CREATE OR REPLACE FUNCTION public.trigger_recalculate_points()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.status = 'finished' AND NEW.goals_barca IS NOT NULL AND NEW.goals_rival IS NOT NULL) OR
     (OLD.status = 'finished' AND NEW.status <> 'finished') OR
     (NEW.goals_barca IS DISTINCT FROM OLD.goals_barca) OR
     (NEW.goals_rival IS DISTINCT FROM OLD.goals_rival) THEN
    PERFORM public.calculate_match_points(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_match_score_updated ON public.matches;
CREATE TRIGGER on_match_score_updated
  AFTER UPDATE OF status, goals_barca, goals_rival ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_points();

-- 5. VISTA CLASSIFICACIÓ (LEADERBOARD)
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT 
  p.id AS user_id,
  p.nom,
  p.avatar_color,
  p.is_admin,
  COALESCE(SUM(b.points_earned), 0)::INTEGER AS total_points,
  COUNT(b.id)::INTEGER AS bets_count,
  COUNT(CASE WHEN b.points_earned = 3 THEN 1 END)::INTEGER AS exact_hits,
  COUNT(CASE WHEN b.points_earned = 1 THEN 1 END)::INTEGER AS outcome_hits,
  COUNT(CASE WHEN b.points_earned = 0 THEN 1 END)::INTEGER AS misses
FROM public.profiles p
LEFT JOIN public.bets b ON p.id = b.user_id AND b.points_earned IS NOT NULL
GROUP BY p.id, p.nom, p.avatar_color, p.is_admin
ORDER BY total_points DESC, exact_hits DESC, outcome_hits DESC, p.nom ASC;

-- ====================================================================
-- 6. PERMISOS I ROW LEVEL SECURITY (RLS)
-- Netegem qualsevol política antiga de versions prèvies per evitar bloquejos:
-- ====================================================================

-- Eliminar antigues polítiques de matches
DROP POLICY IF EXISTS "Admins poden gestionar partits (insert)" ON public.matches;
DROP POLICY IF EXISTS "Admins poden gestionar partits (update)" ON public.matches;
DROP POLICY IF EXISTS "Admins poden gestionar partits (delete)" ON public.matches;
DROP POLICY IF EXISTS "Partits visibles per tothom" ON public.matches;
DROP POLICY IF EXISTS "Lectura matches" ON public.matches;
DROP POLICY IF EXISTS "Gestio matches" ON public.matches;
DROP POLICY IF EXISTS "allow_all_matches" ON public.matches;

-- Eliminar antigues polítiques de bets
DROP POLICY IF EXISTS "Crear porra abans de l'inici" ON public.bets;
DROP POLICY IF EXISTS "Modificar porra abans de l'inici" ON public.bets;
DROP POLICY IF EXISTS "Eliminar porra abans de l'inici" ON public.bets;
DROP POLICY IF EXISTS "Lectura de porres" ON public.bets;
DROP POLICY IF EXISTS "Lectura bets" ON public.bets;
DROP POLICY IF EXISTS "Gestio bets" ON public.bets;
DROP POLICY IF EXISTS "allow_all_bets" ON public.bets;

-- Eliminar antigues polítiques de profiles
DROP POLICY IF EXISTS "Profiles son visibles per tothom" ON public.profiles;
DROP POLICY IF EXISTS "Usuaris poden actualitzar el seu perfil" ON public.profiles;
DROP POLICY IF EXISTS "Lectura profiles" ON public.profiles;
DROP POLICY IF EXISTS "Gestio profiles" ON public.profiles;
DROP POLICY IF EXISTS "allow_all_profiles" ON public.profiles;

-- Per a una aplicació familiar protegida per PIN a l'admin,
-- permetem accés complet d'escriptura i lectura per a les taules:
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_profiles" ON public.profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_matches" ON public.matches FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_bets" ON public.bets FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 7. HABILITAR PUBLICACIÓ EN TEMPS REAL (SUPABASE REALTIME)
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bets;
