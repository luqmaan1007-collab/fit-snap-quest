
CREATE TYPE public.app_role AS ENUM ('user','pro','owner');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role);
$$;

CREATE OR REPLACE FUNCTION public.is_premium(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role IN ('pro','owner'));
$$;

CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  display_name text,
  email text,
  avatar_url text,
  age int,
  sex text,
  height_cm numeric,
  weight_kg numeric,
  activity_level text,
  goal text,
  target_weight_kg numeric,
  daily_kcal_target int,
  daily_protein_g int,
  daily_carbs_g int,
  daily_fat_g int,
  onboarded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TYPE public.friend_status AS ENUM ('pending','accepted');
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status friend_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own friendships" ON public.friendships FOR SELECT TO authenticated USING (auth.uid() IN (requester_id, addressee_id));
CREATE POLICY "send friend req" ON public.friendships FOR INSERT TO authenticated WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "update own friendships" ON public.friendships FOR UPDATE TO authenticated USING (auth.uid() IN (requester_id, addressee_id));
CREATE POLICY "delete own friendships" ON public.friendships FOR DELETE TO authenticated USING (auth.uid() IN (requester_id, addressee_id));

CREATE OR REPLACE FUNCTION public.are_friends(a uuid, b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.friendships
    WHERE status='accepted' AND ((requester_id=a AND addressee_id=b) OR (requester_id=b AND addressee_id=a)));
$$;

CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  invite_code text NOT NULL UNIQUE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.groups TO authenticated;
GRANT ALL ON public.groups TO service_role;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.group_members (
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.group_members TO authenticated;
GRANT ALL ON public.group_members TO service_role;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_group_member(_group uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.group_members WHERE group_id=_group AND user_id=_user);
$$;

CREATE OR REPLACE FUNCTION public.shares_group(a uuid, b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.group_members gm1
    JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id=a AND gm2.user_id=b);
$$;

CREATE POLICY "view own group memberships" ON public.group_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_group_member(group_id, auth.uid()));
CREATE POLICY "join groups" ON public.group_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "leave groups" ON public.group_members FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "view groups you belong to" ON public.groups FOR SELECT TO authenticated USING (public.is_group_member(id, auth.uid()));
CREATE POLICY "create groups" ON public.groups FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner updates group" ON public.groups FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "owner deletes group" ON public.groups FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE POLICY "view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.are_friends(auth.uid(), user_id) OR public.shares_group(auth.uid(), user_id));
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.food_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url text,
  name text NOT NULL,
  description text,
  kcal numeric NOT NULL DEFAULT 0,
  protein_g numeric NOT NULL DEFAULT 0,
  carbs_g numeric NOT NULL DEFAULT 0,
  fat_g numeric NOT NULL DEFAULT 0,
  fiber_g numeric NOT NULL DEFAULT 0,
  sugar_g numeric NOT NULL DEFAULT 0,
  sodium_mg numeric NOT NULL DEFAULT 0,
  vit_a_mcg numeric NOT NULL DEFAULT 0,
  vit_c_mg numeric NOT NULL DEFAULT 0,
  vit_d_mcg numeric NOT NULL DEFAULT 0,
  vit_b12_mcg numeric NOT NULL DEFAULT 0,
  iron_mg numeric NOT NULL DEFAULT 0,
  calcium_mg numeric NOT NULL DEFAULT 0,
  ai_raw jsonb,
  logged_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX food_logs_user_day_idx ON public.food_logs(user_id, logged_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_logs TO authenticated;
GRANT ALL ON public.food_logs TO service_role;
ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own + friends + group food" ON public.food_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.are_friends(auth.uid(), user_id) OR public.shares_group(auth.uid(), user_id));
CREATE POLICY "insert own food" ON public.food_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own food" ON public.food_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "delete own food" ON public.food_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.step_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  steps int NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'manual',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date, source)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.step_logs TO authenticated;
GRANT ALL ON public.step_logs TO service_role;
ALTER TABLE public.step_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own + friends + group steps" ON public.step_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.are_friends(auth.uid(), user_id) OR public.shares_group(auth.uid(), user_id));
CREATE POLICY "insert own steps" ON public.step_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own steps" ON public.step_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "delete own steps" ON public.step_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.google_fit_tokens (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.google_fit_tokens TO service_role;
ALTER TABLE public.google_fit_tokens ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.subscriptions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text NOT NULL DEFAULT 'inactive',
  current_period_end timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own sub" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  IF NEW.email IN ('luqmaan1007@hotmail.com','fardowsah994@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
