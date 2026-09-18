-- Per-user cloud build credentials (each user brings their own Codemagic + GitHub).
CREATE TABLE public.build_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  codemagic_token text,
  codemagic_app_id text,
  codemagic_branch text NOT NULL DEFAULT 'main',
  github_token text,
  github_repo text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.build_settings TO authenticated;
GRANT ALL ON public.build_settings TO service_role;

ALTER TABLE public.build_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own build settings select" ON public.build_settings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own build settings insert" ON public.build_settings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own build settings update" ON public.build_settings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own build settings delete" ON public.build_settings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER build_settings_touch_updated_at BEFORE UPDATE ON public.build_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
