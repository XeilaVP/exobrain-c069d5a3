REVOKE SELECT ON public.user_ai_settings FROM authenticated;
GRANT SELECT (user_id, provider, model, openai_key_last4, created_at, updated_at) ON public.user_ai_settings TO authenticated;