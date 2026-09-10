-- ====================================================================
-- MIGRACIÓ: comptador "Signe + diferència de gols" (2 punts) a la classificació
-- --------------------------------------------------------------------
-- Afegeix la columna `diff_hits` a la vista `leaderboard` i, de passada,
-- fa que `exact_hits` compti també els encerts exactes amb JoQuer (>= 3),
-- que abans quedaven fora.
--
-- Executa aquest fitxer sencer a Supabase → SQL Editor.
-- (Requereix haver aplicat abans `migration-scoring-diff.sql`.)
--
-- IMPORTANT: la vista real de la BD té la columna `avatar_url` (i també
-- `avatar_color`), per això NO es pot fer servir CREATE OR REPLACE (no permet
-- canviar/afegir columnes al mig). Fem DROP + CREATE i re-apliquem els permisos.
-- ====================================================================

DROP VIEW IF EXISTS public.leaderboard;

CREATE VIEW public.leaderboard AS
SELECT
  p.id AS user_id,
  p.nom,
  p.avatar_url,
  p.avatar_color,
  p.is_admin,
  COALESCE(SUM(b.points_earned), 0)::INTEGER AS total_points,
  COUNT(b.id)::INTEGER AS bets_count,
  COUNT(CASE WHEN b.points_earned >= 3 THEN 1 END)::INTEGER AS exact_hits,
  COUNT(CASE WHEN b.points_earned = 2 THEN 1 END)::INTEGER AS diff_hits,
  COUNT(CASE WHEN b.points_earned = 1 THEN 1 END)::INTEGER AS outcome_hits,
  COUNT(CASE WHEN b.points_earned = 0 THEN 1 END)::INTEGER AS misses
FROM public.profiles p
LEFT JOIN public.bets b ON p.id = b.user_id AND b.points_earned IS NOT NULL
GROUP BY p.id, p.nom, p.avatar_url, p.avatar_color, p.is_admin
ORDER BY total_points DESC, exact_hits DESC, outcome_hits DESC, p.nom ASC;

-- Re-aplicar permisos de lectura (es perden en fer DROP de la vista)
GRANT SELECT ON public.leaderboard TO anon, authenticated;
