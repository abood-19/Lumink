# LUMINK

منصة رقمية لفناني الوشم: محاكاة على الجسم، ستنسل، مولّد رسومات، ألوان، وشم مضيء، ملفات العملاء، المخزون، حاسبة السعر، الموردون، ومجتمع.
اللغات: الروسية (الأساسية)، الإنجليزية، الأوزبكية، العربية (من اليمين لليسار).

---

## 1. التشغيل على جهازك (تجربة)

تحتاج **Node.js 20 أو أحدث**.

```bash
npm install
npm run dev
```

افتح `http://localhost:3000`.

بدون أي مفاتيح، المنصة تعمل **بالوضع التجريبي**: كل الأدوات شغالة، والبيانات (العملاء، المخزون) تُحفظ على نفس الجهاز فقط. المولّد بالذكاء الاصطناعي والدخول والمجتمع يحتاجون المفاتيح بالأسفل.

---

## 2. الحسابات المطلوبة (كلها بالإيميل الجديد)

| الخدمة | لماذا | الرابط |
|---|---|---|
| GitHub | حفظ الكود | github.com |
| Vercel | استضافة الموقع | vercel.com |
| Supabase | الحسابات، قاعدة البيانات، الصور | supabase.com |
| Google AI Studio | مفتاح Gemini للمولّد | aistudio.google.com/apikey |

---

## 3. إعداد Supabase

1. أنشئ مشروعاً جديداً.
2. من **SQL Editor** الصق محتوى الملف `supabase/schema.sql` واضغط **Run**.
3. من **Project Settings → API** انسخ:
   - `Project URL` ← `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` ← `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` ← `SUPABASE_SERVICE_ROLE_KEY` (سري، لا تشاركه)
4. من **Authentication → Providers** فعّل:
   - **Email** (رابط دخول).
   - **Google**: يحتاج Client ID و Secret من Google Cloud Console.
   - **Phone**: يحتاج مزوّد رسائل SMS (مثل Twilio)، وهذا مدفوع حسب عدد الرسائل.
5. من **Authentication → URL Configuration** ضع رابط موقعك في `Site URL`، وأضف `https://موقعك/auth/callback` في `Redirect URLs`.

### بعد أول تسجيل دخول
شغّل في SQL Editor (غيّر الإيميلات):

```sql
-- أنت: المالك وصلاحيات كاملة
update public.profiles set role = 'admin', lifetime = true
  where id = (select id from auth.users where email = 'YOUR_EMAIL');

-- ليو: مجاني للأبد
update public.profiles set plan = 'gold', lifetime = true
  where id = (select id from auth.users where email = 'LEO_EMAIL');
```

---

## 4. ملف المفاتيح

انسخ `.env.example` باسم `.env.local` واملأ القيم. على Vercel ضعها في **Settings → Environment Variables**.

---

## 5. الرفع على الإنترنت

1. ارفع المجلد على GitHub (حسابك الجديد).
2. في Vercel: **Add New → Project** واختر المستودع.
3. أضف متغيرات البيئة، ثم **Deploy**.
4. اربط النطاق (مثل `lumink.app`) من **Settings → Domains**.

---

## 6. ما يجب تجهيزه قبل الإطلاق

- **الصورة الرئيسية**: ضع صورة باسم `public/hero.jpg` (يفضل 2400×1400). بدونها تظهر خلفية متدرجة.
- **روابط التواصل**: عدّلها في `src/lib/site.ts`.
- **صور المجتمع**: الرسومات الحالية مؤقتة، وتُستبدل تلقائياً بالمنشورات الحقيقية.
- **سياسة الخصوصية والشروط**: صفحات `/privacy` و`/terms` تحتاج نصاً قانونياً يراجعه محامٍ.
- **الدفع**: صفحة `/studio/billing` جاهزة كمكان، وتحتاج ربط بوابة دفع (Payme / Click داخل أوزبكستان، أو Stripe / Paddle للبطاقات العالمية). عند نجاح الدفع يتم تحديث `plan` و`tokens` في جدول `profiles`.
- **الموردون**: القائمة في `src/lib/suppliers.ts`. تأكد من الشحن لأوزبكستان قبل الاعتماد عليهم.

---

## 7. خريطة المشروع

```
src/app/(site)/        صفحات الموقع العامة (الرئيسية، المحاكي، الاستوديو، المجتمع، الأسعار، من نحن، تواصل، الدخول)
src/app/studio/        منطقة الفنان الخاصة (بعد تسجيل الدخول)
src/app/api/           المولّد بالذكاء الاصطناعي ونشر المنشورات
src/components/        كل الأجزاء: المحاكي، الستنسل، الألوان، العملاء...
src/lib/i18n/          الترجمات بالأربع لغات (site.*.json و app.*.json)
src/lib/plans.ts       الباقات والأسعار وعدد الرموز
supabase/schema.sql    قاعدة البيانات والصلاحيات
```

## 8. الصلاحيات

- **المالك (admin)**: يحذف أو يخفي أي منشور، ويقرأ البلاغات ورسائل التواصل.
- **المشترك**: يتحكم بمنشوراته وصفحته فقط.
- **المجاني**: يتصفح ويستخدم 50 رمزاً شهرياً (كل عملية توليد = 10 رموز)، ويبلّغ عن المنشورات.
- **ملفات العملاء والمخزون**: خاصة بصاحبها فقط، ولا يستطيع حتى المالك قراءتها.
