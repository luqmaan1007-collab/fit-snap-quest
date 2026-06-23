CREATE TABLE public.snap_bonuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  earned_on DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  source TEXT NOT NULL DEFAULT 'ad',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.snap_bonuses TO authenticated;
GRANT ALL ON public.snap_bonuses TO service_role;
ALTER TABLE public.snap_bonuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bonuses select" ON public.snap_bonuses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own bonuses insert" ON public.snap_bonuses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX snap_bonuses_user_day ON public.snap_bonuses (user_id, earned_on);