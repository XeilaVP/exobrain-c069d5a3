import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export async function getAuthedUser(req: Request) {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization");
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user } } = await anon.auth.getUser(accessToken);
  return user ?? null;
}

export function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const enc = new TextEncoder();
const dec = new TextDecoder();

async function aesKey() {
  const secret = Deno.env.get("USER_KEY_ENCRYPTION_SECRET");
  if (!secret) throw new Error("USER_KEY_ENCRYPTION_SECRET is not configured");
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromB64 = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

export async function encryptSecret(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(), enc.encode(plain)),
  );
  return `${toB64(iv)}.${toB64(cipher)}`;
}

export async function decryptSecret(payload: string): Promise<string> {
  const [ivPart, dataPart] = payload.split(".");
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(ivPart) },
    await aesKey(),
    fromB64(dataPart),
  );
  return dec.decode(plain);
}
