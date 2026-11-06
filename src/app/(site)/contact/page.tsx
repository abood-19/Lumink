import { getT } from "@/lib/i18n/t";
import { Kicker } from "@/components/Decor";
import { ContactForm } from "@/components/ContactForm";
import { SocialIcon } from "@/components/SiteFooter";
import { SOCIALS } from "@/lib/site";

export const metadata = { title: "Contact" };

export default async function ContactPage() {
  const t = await getT();
  return (
    <section className="lx-up mx-auto flex max-w-[1240px] flex-wrap gap-14 px-6 pb-28 pt-20">
      <div className="min-w-0 flex-[1_1_400px]">
        <Kicker>{t.ct_kicker}</Kicker>
        <h1 className="m-0 text-[clamp(36px,5vw,66px)] font-bold leading-[1.04] tracking-[-.03em]">{t.ct_title}</h1>
        <p className="mb-10 mt-5 max-w-[460px] text-lg leading-relaxed text-mist">{t.ct_sub}</p>
        <p className="mb-3.5 text-sm text-ash">{t.ct_social}</p>
        <div className="flex flex-wrap gap-2.5">
          {SOCIALS.map((s) => (
            <a key={s.name} href={s.href} className="lx-btn lx-btn-ghost !font-medium">
              <SocialIcon d={s.icon} color={s.color} size={20} />
              {s.name}
            </a>
          ))}
        </div>
      </div>
      <ContactForm />
    </section>
  );
}
