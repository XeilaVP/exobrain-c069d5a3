CREATE TABLE public.user_ai_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'lovable',
  model text,
  openai_api_key_encrypted text,
  openai_key_last4 text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_ai_settings_provider_check CHECK (provider IN ('lovable','openai'))
);

GRANT SELECT ON public.user_ai_settings TO authenticated;
GRANT ALL ON public.user_ai_settings TO service_role;

ALTER TABLE public.user_ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai settings"
ON public.user_ai_settings FOR SELECT TO authenticated
USING (auth.uid() = user_id);

REVOKE SELECT (openai_api_key_encrypted) ON public.user_ai_settings FROM authenticated;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_user_ai_settings_updated_at
BEFORE UPDATE ON public.user_ai_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();