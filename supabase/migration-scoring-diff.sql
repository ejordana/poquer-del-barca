-- ====================================================================
-- MIGRACIÓ: nou nivell de puntuació "Signe + diferència de gols" = 2 punts
-- --------------------------------------------------------------------
-- Barem: Exacte = 3 · Signe + diferència = 2 · Només signe = 1 · Fallada = 0
-- (JoQuer segueix donant 3 + gols totals només al marcador exacte.)
--
-- Executa aquest fitxer sencer a Supabase → SQL Editor.
-- Actualitza la funció de càlcul I recalcula els partits ja finalitzats.
-- ====================================================================

CREATE OR REPLACE FUNCTION public.calculate_match_points(target_match_id UUID)
RETURNS VOID AS $$
DECLARE
  m_goals_barca INTEGER;
  m_goals_rival INTEGER;
  m_status TEXT;
  exact_pts INTEGER := 3;
  diff_pts INTEGER := 2;
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
    -- 2. Encert del signe I de la diferència de gols (2 punts).
    --    Si les diferències coincideixen, el signe també coincideix per força
    --    (inclou els empats amb marcador diferent, on la diferència és 0 = 0).
    WHEN (predicted_goals_barca - predicted_goals_rival) = (m_goals_barca - m_goals_rival) THEN diff_pts
    -- 3. Encert de victòria del Barça (1 punt)
    WHEN (predicted_goals_barca > predicted_goals_rival) AND (m_goals_barca > m_goals_rival) THEN outcome_pts
    -- 4. Encert d'empat (1 punt)
    WHEN (predicted_goals_barca = predicted_goals_rival) AND (m_goals_barca = m_goals_rival) THEN outcome_pts
    -- 5. Encert de derrota del Barça (1 punt)
    WHEN (predicted_goals_barca < predicted_goals_rival) AND (m_goals_barca < m_goals_rival) THEN outcome_pts
    -- 6. Fallada (0 punts)
    ELSE miss_pts
  END,
  updated_at = NOW()
  WHERE match_id = target_match_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recalcular tots els partits ja finalitzats amb el nou barem
SELECT public.calculate_match_points(id)
FROM public.matches
WHERE status = 'finished';
