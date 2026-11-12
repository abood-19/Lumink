import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateLineArt, geminiConfigured, moderate, type GenMode } from "@/lib/gemini";
import { getServerSupabase } from "@/lib/supabase/server";
import { TOKENS_PER_GENERATION } from "@/lib/plans";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Server-only refund (users cannot call it themselves). */
async function refund(userId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  await createClient(url, key, { auth: { persistSession: false } }).rpc("refund_tokens_for", { uid: userId, amount: TOKENS_PER_GENERATION });
}

export async function POST(req: Request) {
  const { prompt, style, mode } = (await req.json().catch(() => ({}))) as { prompt?: string; style?: string; mode?: string };
  const text = (prompt ?? "").trim();
  if (!text || text.length > 600) return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (!geminiConfigured) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const genMode: GenMode | undefined = mode === "color" || mode === "shaded" || mode === "line" ? mode : undefined; // none = decide from the text

  // Topic guard: the generator only makes tattoo designs.
  if (!(await moderate(text, "prompt"))) return NextResponse.json({ error: "refused" }, { status: 422 });

  // Charge before generating, refund if it fails.
  // Free: 10 tokens per image. Pro / Pro Gold: unlimited (daily fair-use cap). Admin / lifetime: free.
  const sb = await getServerSupabase();
  if (!sb && process.env.NODE_ENV === "production" && process.env.ALLOW_FREE_GENERATION !== "1") return NextResponse.json({ error: "login" }, { status: 401 });
  let userId: string | null = null;
  let remaining: number | null = null;
  if (sb) {
    const { data: auth } = await sb.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: "login" }, { status: 401 });
    userId = auth.user.id;
    const { data, error } = await sb.rpc("spend_tokens", { amount: TOKENS_PER_GENERATION });
    if (error) return NextResponse.json({ error: /daily cap/.test(error.message) ? "daily_cap" : "no_tokens" }, { status: 402 });
    remaining = typeof data === "number" ? data : null;
  }

  try {
    const image = await generateLineArt(text, (style ?? "").slice(0, 60), genMode);
    return NextResponse.json({ image, remaining: remaining === -1 ? "unlimited" : remaining });
  } catch (e) {
    if (userId) await refund(userId).catch(() => {});
    console.error(e);
    return NextResponse.json({ error: "failed" }, { status: 502 });
  }
}
