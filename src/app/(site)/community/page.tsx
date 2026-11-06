import { getT } from "@/lib/i18n/t";
import { PageIntro } from "@/components/PageIntro";
import { CommunityFeed, type Post } from "@/components/CommunityFeed";
import { getProfile, getServerSupabase } from "@/lib/supabase/server";
import { PLANS } from "@/lib/plans";

export const metadata = { title: "Community" };
export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const t = await getT();
  const sb = await getServerSupabase();
  let posts: Post[] | null = null;
  if (sb) {
    const { data } = await sb.from("posts").select("*").order("created_at", { ascending: false }).limit(60);
    posts = (data as Post[]) ?? [];
  }
  const profile = await getProfile();
  const me = profile
    ? { id: profile.id, admin: profile.role === "admin", canPost: profile.role === "admin" || profile.lifetime || PLANS[profile.plan].canPost }
    : null;

  const cards = [1, 2, 3, 4].map((n) => ({ title: t[`c${n}` as "c1"], desc: t[`c${n}d` as "c1d"] }));
  return (
    <>
      <PageIntro kicker={t.hc_kicker} title={t.cm_title} sub={t.cm_sub} />
      <section className="mx-auto grid max-w-[1240px] grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4 px-6 pb-16 pt-8">
        {cards.map((c, i) => (
          <article key={c.title} className="lx-card-light p-7">
            <p className="mb-7 font-display text-sm text-lilac">0{i + 1}</p>
            <h2 className="mb-2 text-xl font-semibold">{c.title}</h2>
            <p className="m-0 text-[15px] leading-relaxed text-mist">{c.desc}</p>
          </article>
        ))}
      </section>
      <CommunityFeed initial={posts} me={me} />
    </>
  );
}
