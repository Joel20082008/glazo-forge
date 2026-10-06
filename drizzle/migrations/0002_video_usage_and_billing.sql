-- Subscription fields on profiles (written only by the server / payment webhooks)
ALTER TABLE public.profiles
  ADD COLUMN subscription_status text NOT NULL DEFAULT 'inactive',
  ADD COLUMN subscription_started_at timestamptz,
  ADD COLUMN subscription_renews_at timestamptz,
  ADD COLUMN payment_provider text,
  ADD COLUMN payment_customer_ref text;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_check CHECK (plan IN ('free', 'pro', 'premium'));

-- Users may only edit their own display name and niche, never plan or billing fields
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, niche) ON public.profiles TO authenticated;
REVOKE INSERT ON public.profiles FROM authenticated;
GRANT INSERT (id, display_name, niche) ON public.profiles TO authenticated;

-- Server-side project limit
CREATE OR REPLACE FUNCTION public.plan_project_limit(_plan text)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _plan WHEN 'pro' THEN 200 WHEN 'premium' THEN 2000 ELSE 10 END
$$;

CREATE OR REPLACE FUNCTION public.enforce_project_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _plan text;
  _count integer;
BEGIN
  SELECT plan INTO _plan FROM public.profiles WHERE id = NEW.user_id;
  SELECT count(*) INTO _count FROM public.projects WHERE user_id = NEW.user_id;
  IF _count >= public.plan_project_limit(COALESCE(_plan, 'free')) THEN
    RAISE EXCEPTION 'PROJECT_LIMIT_REACHED' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER projects_enforce_limit
BEFORE INSERT ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.enforce_project_limit();

-- Video generation history
CREATE TABLE public.video_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  aspect_ratio text NOT NULL,
  duration_seconds integer NOT NULL,
  has_image boolean NOT NULL DEFAULT false,
  job_id text,
  status text NOT NULL DEFAULT 'queued',
  progress integer,
  error text,
  storage_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX video_generations_user_created_idx ON public.video_generations (user_id, created_at DESC);
GRANT SELECT ON public.video_generations TO authenticated;
GRANT ALL ON public.video_generations TO service_role;
ALTER TABLE public.video_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own video generations select" ON public.video_generations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Payment events (for a future Paystack / Flutterwave webhook; server only)
CREATE TABLE public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_reference text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  plan text,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_reference, event_type)
);
GRANT ALL ON public.payment_events TO service_role;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;