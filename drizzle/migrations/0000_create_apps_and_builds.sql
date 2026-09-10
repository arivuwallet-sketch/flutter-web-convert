CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  website_url text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX apps_user_id_idx ON public.apps(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apps TO authenticated;
GRANT ALL ON public.apps TO service_role;
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own apps select" ON public.apps FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own apps insert" ON public.apps FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own apps update" ON public.apps FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own apps delete" ON public.apps FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.builds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  platform text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  provider text,
  external_id text,
  artifact_url text,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX builds_app_id_idx ON public.builds(app_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.builds TO authenticated;
GRANT ALL ON public.builds TO service_role;
ALTER TABLE public.builds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own builds select" ON public.builds FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own builds insert" ON public.builds FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own builds update" ON public.builds FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own builds delete" ON public.builds FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER apps_touch_updated_at BEFORE UPDATE ON public.apps
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();