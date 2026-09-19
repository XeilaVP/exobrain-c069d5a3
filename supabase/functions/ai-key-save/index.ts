import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, corsHeaders, encryptSecret, getAuthedUser, json } from "../_shared/user-ai-key.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const user = await getAuthedUser(req);
  if (!user) return json({ error: "Unauthorized" }, 401);

  try {
    const body = await req.json().catch(() => ({}));
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    const model = typeof body.model === "string" && body.model.trim() ? body.model.trim() : null;
    const db = adminClient();

    // Solo cambio de modelo (clave ya guardada)
    if (!apiKey) {
      if (!model) return json({ error: "Falta la clave o el modelo" }, 400);
      const { data: existing } = await db
        .from("user_ai_settings")
        .select("openai_api_key_encrypted")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!existing?.openai_api_key_encrypted) {
        return json({ code: "NO_KEY", error: "Primero guarda tu clave de OpenAI" }, 400);
      }
      const { error } = await db
        .from("user_ai_settings")
        .update({ model, provider: "openai" })
        .eq("user_id", user.id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, model });
    }

    if (apiKey.length < 20) return json({ code: "INVALID_KEY", error: "La clave no parece válida" }, 400);

    // Validar contra OpenAI
    const check = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (check.status === 401) {
      return json({ code: "INVALID_KEY", error: "OpenAI ha rechazado la clave" }, 400);
    }
    if (!check.ok) {
      const text = await check.text();
      return json({ code: "OPENAI_ERROR", error: `OpenAI respondió ${check.status}: ${text.slice(0, 200)}` }, 400);
    }

    const encrypted = await encryptSecret(apiKey);
    const last4 = apiKey.slice(-4);

    const { error } = await db.from("user_ai_settings").upsert({
      user_id: user.id,
      provider: "openai",
      model: model ?? "gpt-4o-mini",
      openai_api_key_encrypted: encrypted,
      openai_key_last4: last4,
    }, { onConflict: "user_id" });
    if (error) return json({ error: error.message }, 500);

    return json({ ok: true, last4, model: model ?? "gpt-4o-mini" });
  } catch (e) {
    console.error("ai-key-save error:", e);
    return json({ error: e instanceof Error ? e.message : "Error desconocido" }, 500);
  }
});
