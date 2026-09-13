-- ====================================================================
-- MIGRACIÓ: control d'una única fila per evitar crides repetides
-- a football-data.org dins del mateix minut.
-- --------------------------------------------------------------------
-- Executa aquest fitxer sencer a Supabase → SQL Editor.
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.sync_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_synced_at TIMESTAMPTZ,
  CONSTRAINT sync_state_single_row CHECK (id = 1)
);

INSERT INTO public.sync_state (id, last_synced_at)
VALUES (1, NULL)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.sync_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_sync_state" ON public.sync_state;
CREATE POLICY "allow_all_sync_state" ON public.sync_state FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
