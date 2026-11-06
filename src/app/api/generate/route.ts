import { NextResponse } from "next/server";
import { generateLineArt, geminiConfigured, moderate } from "@/lib/gemini";
import { getServerSupabase } from "@/lib/supabase/server";
import { TOKENS_PER_GENERATION } from "@/lib/plans";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { prompt, style } = (await req.json().catch(() => ({}))) as { prompt?: string; style?: string };
  const text = (prompt ?? "").trim();
  if (!text || text.length > 600) return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (!geminiConfigured) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  // Topic guard: the generator only makes tattoo designs.
  if (!(await moderate(text, "prompt"))) return NextResponse.json({ error: "refused" }, { status: 422 });

  // Tokens: charged before generating, refunded if generation fails.
  const sb = await getServerSupabase();
  // Without accounts there is no way to charge tokens, so a live deployment refuses instead of generating for free.
  if (!sb && process.env.NODE_ENV === "production" && process.env.ALLOW_FREE_GENERATION !== "1") return NextResponse.json({ error: "login" }, { status: 401 });
  if (sb) {
    const { data: auth } = await sb.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: "login" }, { status: 401 });
    const { error } = await sb.rpc("spend_tokens", { amount: TOKENS_PER_GENERATION });
    if (error) return NextResponse.json({ error: "no_tokens" }, { status: 402 });
  }

  try {
    const image = await generateLineArt(text, (style ?? "").slice(0, 60));
    return NextResponse.json({ image });
  } catch (e) {
    if (sb) await sb.rpc("refund_tokens", { amount: TOKENS_PER_GENERATION });
    console.error(e);
    return NextResponse.json({ error: "failed" }, { status: 502 });
  }
}
