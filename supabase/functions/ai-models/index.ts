import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, corsHeaders, decryptSecret, getAuthedUser, json } from "../_shared/user-ai-key.ts";

const isChatModel = (id: string) =>
  /^(gpt-|o1|o3|o4|chatgpt-)/.test(id) &&
  !/(embedding|tts|whisper|transcribe|image|dall-e|moderation|realtime|search|codex)/.test(id);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const user = await getAuthedUser(req);
  if (!user) return json({ error: "Unauthorized" }, 401);

  try {
    const body = await req.json().catch(() => ({}));
    let apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";

    if (!apiKey) {
      const { data } = await adminClient()
        .from("user_ai_settings")
        .select("openai_api_key_encrypted")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!data?.openai_api_key_encrypted) return json({ code: "NO_KEY", models: [] }, 200);
      apiKey = await decryptSecret(data.openai_api_key_encrypted);
    }

    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.status === 401) return json({ code: "INVALID_KEY", error: "Clave rechazada por OpenAI" }, 400);
    if (!res.ok) return json({ code: "OPENAI_ERROR", error: `OpenAI respondió ${res.status}` }, 400);

    const payload = await res.json();
    const models: string[] = (payload.data ?? [])
      .map((m: { id: string }) => m.id)
      .filter(isChatModel)
      .sort();

    return json({ models });
  } catch (e) {
    console.error("ai-models error:", e);
    return json({ error: e instanceof Error ? e.message : "Error desconocido" }, 500);
  }
});
