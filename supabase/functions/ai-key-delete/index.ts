import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, corsHeaders, getAuthedUser, json } from "../_shared/user-ai-key.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const user = await getAuthedUser(req);
  if (!user) return json({ error: "Unauthorized" }, 401);

  const db = adminClient();
  const { error } = await db.from("user_ai_settings").upsert({
    user_id: user.id,
    provider: "lovable",
    model: null,
    openai_api_key_encrypted: null,
    openai_key_last4: null,
  }, { onConflict: "user_id" });
  if (error) return json({ error: error.message }, 500);

  return json({ ok: true });
});
