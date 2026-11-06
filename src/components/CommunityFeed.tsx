"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { ArtTile } from "./ArtTile";
import { PLACEHOLDER_ART } from "@/lib/site";

export type Post = { id: string; author_id: string; image_url: string; caption: string; style: string; city: string; author_name?: string | null };

export function CommunityFeed({ initial, me }: { initial: Post[] | null; me: { id: string; admin: boolean; canPost: boolean } | null }) {
  const { t } = useI18n();
  const [posts, setPosts] = useState<Post[]>(initial ?? []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const live = initial !== null;

  const publish = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/community/post", { method: "POST", body: new FormData(form) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setPosts((p) => [json.post, ...p]);
      form.reset();
    } else setMsg(json.error === "blocked" ? t.post_blocked : json.error === "plan" ? t.post_need_plan : t.gen_error);
  };

  const report = async (id: string) => {
    const sb = getBrowserSupabase();
    if (sb && me) await sb.from("reports").insert({ post_id: id, reporter_id: me.id });
    setMsg(t.reported);
  };

  const remove = async (id: string) => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    const { error } = await sb.from("posts").delete().eq("id", id);
    if (!error) setPosts((p) => p.filter((x) => x.id !== id));
  };

  return (
    <section className="mx-auto max-w-[1240px] px-6 pb-28">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="m-0 text-2xl font-semibold">{t.cm_feed}</h2>
        {!me && <Link href="/login" className="lx-btn lx-btn-primary lx-btn-sm">{t.cm_join}</Link>}
      </div>

      {me?.canPost && live && (
        <form onSubmit={publish} className="lx-surface-strong mb-8 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] items-end gap-3 p-5">
          <p className="col-span-full m-0 text-sm font-semibold text-[#c4f135]">{t.post_new}</p>
          <label className="flex flex-col gap-2 text-[13px] text-ash">{t.post_photo}<input type="file" name="photo" accept="image/*" required className="lx-input pt-2.5" /></label>
          <label className="flex flex-col gap-2 text-[13px] text-ash">{t.post_caption}<input name="caption" maxLength={1000} className="lx-input" /></label>
          <label className="flex flex-col gap-2 text-[13px] text-ash">{t.post_style}<input name="style" maxLength={40} className="lx-input" /></label>
          <label className="flex flex-col gap-2 text-[13px] text-ash">{t.post_city}<input name="city" maxLength={40} className="lx-input" /></label>
          <button type="submit" disabled={busy} className="lx-btn lx-btn-primary">{t.post_btn}</button>
        </form>
      )}
      {msg && <p role="status" className="mb-6 rounded-xl bg-[rgba(210,210,220,.1)] px-4 py-3 text-sm text-[#e8e8ee]">{msg}</p>}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
        {live && posts.length > 0
          ? posts.map((p, i) => (
              <div key={p.id}>
                <ArtTile src={p.image_url} art={{ style: p.style || "—", city: p.city || "" }} />
                {p.caption && <p className="mb-0 mt-1.5 text-sm leading-snug text-[#cacad2]">{p.caption}</p>}
                <div className="mt-1.5 flex gap-3 text-xs">
                  {p.author_name && <span className="text-ash">{p.author_name}</span>}
                  {me && <button type="button" onClick={() => report(p.id)} className="text-ash hover:text-white">{t.report}</button>}
                  {me && (me.admin || me.id === p.author_id) && <button type="button" onClick={() => remove(p.id)} className="text-[#ff8a92] hover:text-white">{t.remove}</button>}
                </div>
              </div>
            ))
          : PLACEHOLDER_ART.map((a, i) => <ArtTile key={i} art={a} />)}
      </div>
    </section>
  );
}
