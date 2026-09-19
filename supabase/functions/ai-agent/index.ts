import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "npm:ai";
import { createOpenAI } from "npm:@ai-sdk/openai";
import {
  createLovableAiGatewayProvider,
  getLovableAiGatewayRunId,
  getLovableAiGatewayResponseHeaders,
  withLovableAiGatewayRunIdHeader,
} from "../_shared/ai-gateway.ts";
import { adminClient, decryptSecret } from "../_shared/user-ai-key.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return new Response(JSON.stringify({ error: "Supabase environment is not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Validate user identity from the provided access token.
  const authHeader = req.headers.get("Authorization");
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const messages = (body.messages ?? []) as UIMessage[];
    const notesContext = body.notesContext as {
      id: string;
      title: string;
      category: string;
      noteType: string;
      content: string;
      checklist: { text: string; completed: boolean }[];
    }[] | undefined;
    const image = body.image as string | undefined;
    const audio = body.audio as string | undefined;

    let notesContextText = "";
    if (notesContext && notesContext.length > 0) {
      notesContextText = "\n\nNotas del usuario (solo lectura para el contexto):\n\n";
      for (const note of notesContext) {
        notesContextText += `--- Nota ID: ${note.id} | Título: "${note.title}" | Categoría: ${note.category} | Tipo: ${note.noteType} ---\n${note.content.slice(0, 800)}\n`;
        if (note.checklist && note.checklist.length > 0) {
          notesContextText += "Checklist:\n" + note.checklist.map((item) => `- [${item.completed ? "x" : " "}] ${item.text}`).join("\n") + "\n";
        }
        notesContextText += "\n";
      }
    }

    const systemContent = `Eres el compañero de pensamiento de Exobrain, una app de notas con mapa mental. Responde SIEMPRE en español, con tono cercano y estilo brainstorming.

TU ROL: ayudar al usuario a explorar temas, contrastar ideas, resumir información y debatir. Tienes ACCESO A INTERNET a través del modelo (grounding web nativo): úsalo cuando el tema pida datos actuales, novedades, definiciones, referencias o ejemplos, y cita las fuentes que uses al final del mensaje con formato:
- Fuente: [título](url)

REGLA DURA — NUNCA modificas la app. No creas, editas ni borras notas, categorías o tareas. Si el usuario te pide "añade esto a mi lista", "crea una nota", etc., responde con el texto ya listo y sugiérele amablemente que lo copie él mismo. No prometas haberlo hecho.

Estilo: por defecto 4-8 líneas. Sé claro, evita relleno. Usa markdown (negritas, listas) cuando ayude a la lectura. Puedes referenciar las notas del usuario que aparecen abajo como contexto ("según tu nota 'X'…") pero solo para leerlas, nunca para escribir en ellas.
${notesContextText}`;

    // Attach image/audio to the last user message as file parts.
    const processedMessages = [...messages];
    if (image || audio) {
      const lastMsg = processedMessages[processedMessages.length - 1];
      if (lastMsg && lastMsg.role === "user") {
        const extraParts: any[] = [];
        if (image) extraParts.push({ type: "file", mediaType: image.match(/^data:audio\//) ? "audio" : "image", url: image });
        if (audio) extraParts.push({ type: "file", mediaType: "audio", url: audio });
        processedMessages[processedMessages.length - 1] = {
          ...lastMsg,
          parts: [...lastMsg.parts, ...extraParts],
        } as UIMessage;
      }
    }

    const modelMessages = await convertToModelMessages(processedMessages);
    const forceLovable = body.forceLovable === true;

    // ¿Tiene el usuario su propia clave de OpenAI activa?
    let userOpenAiKey: string | null = null;
    let userModel = "gpt-4o-mini";
    if (!forceLovable) {
      const { data: settings } = await adminClient()
        .from("user_ai_settings")
        .select("provider, model, openai_api_key_encrypted")
        .eq("user_id", user.id)
        .maybeSingle();
      if (settings?.provider === "openai" && settings.openai_api_key_encrypted) {
        userOpenAiKey = await decryptSecret(settings.openai_api_key_encrypted);
        userModel = settings.model || userModel;
      }
    }

    // Respuesta por la IA incluida (Lovable AI Gateway), con metadata opcional de fallback
    const runLovable = async (fallback?: { code: string; message: string }) => {
      const initialRunId = getLovableAiGatewayRunId(req);
      const gateway = createLovableAiGatewayProvider(LOVABLE_API_KEY, initialRunId);
      const result = streamText({
        model: gateway("google/gemini-3.5-flash"),
        system: systemContent,
        messages: modelMessages,
      });

      const response = result.toUIMessageStreamResponse({
        headers: getLovableAiGatewayResponseHeaders(undefined, corsHeaders),
        ...(fallback
          ? {
              messageMetadata: () => ({
                fallback: fallback.code,
                fallbackMessage: fallback.message,
              }),
            }
          : {}),
      });

      return await withLovableAiGatewayRunIdHeader(response, gateway, corsHeaders);
    };

    if (userOpenAiKey) {
      if (audio && !/audio/.test(userModel)) {
        return new Response(
          JSON.stringify({
            code: "AUDIO_UNSUPPORTED",
            error: `El modelo ${userModel} no admite audio. Elige un modelo con audio o envía el mensaje con la IA incluida.`,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const classify = (error: unknown): { code: string; message: string } => {
        const err = error as {
          statusCode?: number;
          status?: number;
          message?: string;
          data?: unknown;
          responseBody?: string;
        };
        const status = err?.statusCode ?? err?.status;
        let type = "";
        let code = "";
        try {
          const raw =
            typeof err?.data === "string" ? JSON.parse(err.data) : (err?.data as Record<string, unknown> | undefined);
          const inner = (raw as { error?: { type?: string; code?: string } } | undefined)?.error;
          type = inner?.type ?? "";
          code = inner?.code ?? "";
        } catch {
          // ignore parse errors
        }
        const blob = `${type} ${code} ${err?.message ?? ""} ${err?.responseBody ?? ""}`.toLowerCase();

        if (
          blob.includes("insufficient_quota") ||
          blob.includes("credit_balance_exhausted") ||
          blob.includes("no credits") ||
          status === 402
        ) {
          return { code: "NO_CREDIT", message: "tu cuenta de OpenAI no tiene saldo" };
        }
        if (blob.includes("invalid_api_key") || blob.includes("incorrect api key") || status === 401) {
          return { code: "INVALID_KEY", message: "tu clave de OpenAI ha sido rechazada" };
        }
        if (blob.includes("model_not_found") || status === 404) {
          return { code: "MODEL_UNSUPPORTED", message: `el modelo ${userModel} no está disponible en tu cuenta` };
        }
        if (status === 429) {
          return { code: "RATE_LIMIT", message: "OpenAI ha limitado temporalmente tu cuenta" };
        }
        if (status === 400) {
          return { code: "MODEL_UNSUPPORTED", message: `el modelo ${userModel} no admite esta petición` };
        }
        return { code: "OPENAI_ERROR", message: "tu cuenta de OpenAI ha dado un error" };
      };

      let failure: { code: string; message: string } | null = null;

      const openai = createOpenAI({ apiKey: userOpenAiKey });
      const result = streamText({
        model: openai.chat(userModel),
        system: systemContent,
        messages: modelMessages,
        maxRetries: 0,
        onError: ({ error }: { error: unknown }) => {
          failure = classify(error);
          console.error("openai user-key error:", failure.code, error);
        },
      });

      // No devolvemos el stream de OpenAI hasta confirmar que ha arrancado
      const reader = result.toUIMessageStream().getReader();
      const buffered: unknown[] = [];
      let started = false;

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = value as { type?: string; delta?: string };
          if (chunk?.type === "error") {
            if (!failure) failure = classify(chunk);
            break;
          }
          buffered.push(value);
          if (chunk?.type === "text-delta" && chunk.delta) {
            started = true;
            break;
          }
        }
      } catch (streamError) {
        if (!failure) failure = classify(streamError);
      }

      if (started && !failure) {
        const merged = new ReadableStream({
          async start(controller) {
            try {
              for (const chunk of buffered) controller.enqueue(chunk);
              while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                controller.enqueue(value);
              }
              controller.close();
            } catch (error) {
              controller.error(error);
            }
          },
          cancel: (reason?: unknown) => reader.cancel(reason),
        });

        return createUIMessageStreamResponse({ stream: merged, headers: corsHeaders });
      }

      try {
        await reader.cancel();
      } catch {
        // ignore
      }

      return await runLovable(failure ?? { code: "OPENAI_ERROR", message: "tu cuenta de OpenAI ha dado un error" });
    }

    return await runLovable();
  } catch (e) {
    console.error("ai-agent error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
