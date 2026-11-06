import { NextResponse } from "next/server";
import { getServerSupabase, getProfile } from "@/lib/supabase/server";
import { moderate } from "@/lib/gemini";
import { hasBlockedWords } from "@/lib/moderation";
import { PLANS } from "@/lib/plans";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const sb = await getServerSupabase();
  if (!sb) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "login" }, { status: 401 });
  if (profile.role !== "admin" && !profile.lifetime && !PLANS[profile.plan].canPost) {
    return NextResponse.json({ error: "plan" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("photo");
  const caption = String(form.get("caption") ?? "").trim().slice(0, 1000);
  const style = String(form.get("style") ?? "").trim().slice(0, 40);
  const city = String(form.get("city") ?? "").trim().slice(0, 40);
  if (!(file instanceof File) || !file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "photo" }, { status: 400 });
  }
  const text = [caption, style, city].join(" ");
  if (hasBlockedWords(text) || (caption && !(await moderate(text, "post")))) {
    return NextResponse.json({ error: "blocked" }, { status: 422 });
  }

  const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const path = `${profile.id}/${crypto.randomUUID()}.${ext}`;
  const up = await sb.storage.from("posts").upload(path, file, { contentType: file.type });
  if (up.error) return NextResponse.json({ error: "upload" }, { status: 500 });
  const { data: pub } = sb.storage.from("posts").getPublicUrl(path);

  const { data, error } = await sb
    .from("posts")
    .insert({ author_id: profile.id, author_name: profile.display_name ?? "", image_url: pub.publicUrl, image_path: path, caption, style, city })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: "insert" }, { status: 500 });
  return NextResponse.json({ post: data });
}
