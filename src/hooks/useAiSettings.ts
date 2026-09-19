import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface AiSettings {
  provider: "lovable" | "openai";
  model: string | null;
  last4: string | null;
}

const DEFAULT_SETTINGS: AiSettings = { provider: "lovable", model: null, last4: null };

export const useAiSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AiSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) { setSettings(DEFAULT_SETTINGS); return; }
    const { data } = await supabase
      .from("user_ai_settings")
      .select("provider, model, openai_key_last4")
      .eq("user_id", user.id)
      .maybeSingle();
    setSettings(data
      ? { provider: (data.provider as AiSettings["provider"]) ?? "lovable", model: data.model, last4: data.openai_key_last4 }
      : DEFAULT_SETTINGS);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const saveKey = useCallback(async (apiKey: string, model?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-key-save", { body: { apiKey, model } });
      if (error) throw new Error((data as { error?: string })?.error || error.message);
      await refresh();
      return data as { ok: boolean; last4: string; model: string };
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const saveModel = useCallback(async (model: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-key-save", { body: { model } });
      if (error) throw new Error((data as { error?: string })?.error || error.message);
      await refresh();
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const removeKey = useCallback(async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("ai-key-delete", { body: {} });
      if (error) throw error;
      await refresh();
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const listModels = useCallback(async (apiKey?: string) => {
    const { data, error } = await supabase.functions.invoke("ai-models", { body: apiKey ? { apiKey } : {} });
    if (error) throw error;
    return ((data as { models?: string[] })?.models ?? []);
  }, []);

  return { settings, loading, refresh, saveKey, saveModel, removeKey, listModels };
};
