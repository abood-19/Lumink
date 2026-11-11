# LUMINK — خطوات النشر للسوق

> مهم: GitHub Pages يعرض نسخة تجريبية فقط. **التسجيل والدفع والذكاء الاصطناعي تحتاج سيرفر**، لذلك الموقع الحقيقي يُنشر على **Vercel** (مجاني للبداية).

استخدم نفس الإيميل الجديد الخاص بـ LUMINK في كل الحسابات.

---

## 1) Supabase — الحسابات وقاعدة البيانات
1. supabase.com ← New project (اختر منطقة قريبة: Frankfurt).
2. **SQL Editor** ← الصق محتوى `supabase/schema.sql` كاملاً ← Run.
   - إذا كان المشروع قديماً ومُشغّل سابقاً: شغّل فقط `supabase/update-2026-11.sql`.
3. **Project Settings → API**: انسخ `Project URL` و `anon` و `service_role`.
4. **Authentication → Providers**:
   - Email: مفعّل. 
   - Google: يحتاج Client ID/Secret من console.cloud.google.com (OAuth consent + Credentials). ضع Redirect: `https://<supabase-id>.supabase.co/auth/v1/callback`.
   - Phone: يحتاج Twilio (مدفوع). إذا ما بدك، اتركه مطفي.
5. **Authentication → Email Templates → Magic Link**: الصق `supabase/email-template-magic-link.html` (يرسل رابط + رمز 6 أرقام، فيشتغل على الجوال حتى لو فُتح الرابط بتطبيق ثاني).
6. **Authentication → SMTP**: ⚠️ البريد الافتراضي لـ Supabase محدود جداً (رسائل قليلة بالساعة). اربط SMTP مثل **Resend** (resend.com، مجاني 3000 رسالة/شهر) قبل الإطلاق.
7. **Authentication → URL Configuration**: `Site URL` = رابط موقعك، و`Redirect URLs` أضف `https://موقعك/auth/callback`.

## 2) Gemini — توليد الصور
1. aistudio.google.com ← **Get API key** ← Create key.
2. ⚠️ توليد الصور **يحتاج تفعيل الفوترة**: من AI Studio ← Billing ← اربط بطاقة (Google Cloud Billing). بدونها المولّد يرجع خطأ.
3. ضع المفتاح في `GEMINI_API_KEY`. لا تحتاج تحدد اسم الموديل؛ الموقع يختار موديل شغال تلقائياً.
4. التكلفة تقريباً بضع سنتات للصورة الواحدة؛ راقبها من Google Cloud ← Billing ← Budgets (حط تنبيه مثلاً 30$).

### كيف يرتبط بالاشتراك
- **Free**: ‏50 رمز شهرياً، كل صورة = 10 رموز.
- **Pro / Pro Gold**: توليد **غير محدود** تلقائياً بمجرد الدفع (الـ webhook يحدّث الباقة). يوجد حد يومي للحماية من الإساءة: 150 (Pro) و400 (Gold) — غيّرهم من `daily_cap` في `update-2026-11.sql`.
- **أنت وليو**: غير محدود ومجاني.
- كلفة Gemini تُدفع من حسابك بجوجل، ومصدرها اشتراكات المستخدمين — لا يوجد "خصم" مباشر بين البوابتين، لكن الحد اليومي يضمن أن كل اشتراك يغطي تكلفته.

## 3) Lemon Squeezy — الدفع
1. lemonsqueezy.com ← أنشئ Store، أكمل التحقق (هوية + حساب بنكي/PayPal للسحب).
2. Products ← منتج **LUMINK Pro** باشتراك شهري 19.99$، ومنتج **Pro Gold** سنوي 199.99$. انسخ **Variant ID** لكل واحد.
3. Settings → API ← أنشئ API key. Settings → Stores ← انسخ Store ID.
4. Settings → Webhooks ← URL: `https://موقعك/api/billing/webhook`، Secret: كلمة عشوائية طويلة، وفعّل الأحداث: `subscription_created, subscription_updated, subscription_cancelled, subscription_resumed, subscription_expired, subscription_paused, subscription_unpaused, subscription_payment_success, subscription_payment_recovered`.
5. جرّب أولاً بـ **Test mode** وبطاقة الاختبار `4242 4242 4242 4242`.

> ملاحظة: Lemon Squeezy تنتقل تدريجياً إلى Stripe Managed Payments. الكود يبقى شغال؛ إذا رفضوا التسجيل من أوزبكستان، البدائل: Paddle أو Payme/Click محلياً (تحتاج تعديل `src/lib/billing.ts`).

## 4) Vercel — النشر
1. ارفع المجلد على GitHub (حساب abood-19، مستودع Lumink).
2. vercel.com ← Sign up بـ GitHub ← Add New → Project ← اختر Lumink ← Framework: Next.js.
3. **Environment Variables** (من `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
   - `NEXT_PUBLIC_SITE_URL` = رابط الموقع النهائي
   - `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_WEBHOOK_SECRET`, `LEMONSQUEEZY_VARIANT_PRO`, `LEMONSQUEEZY_VARIANT_GOLD`
4. Deploy. بعدها Settings → Domains لربط دومين (مثل lumink.app).

## 5) بعد أول تسجيل دخول
في Supabase SQL Editor:
```sql
update public.profiles set role = 'admin', lifetime = true where id = (select id from auth.users where email = 'YOUR_EMAIL');
update public.profiles set plan = 'gold', lifetime = true where id = (select id from auth.users where email = 'LEO_EMAIL');
```

## 6) اختبار قبل الإعلان
- [ ] تسجيل بالإيميل (رابط + رمز) من الجوال واللابتوب.
- [ ] Google login.
- [ ] مولّد بحساب Free: ينقص 10 رموز.
- [ ] دفع Pro بوضع الاختبار ← الباقة تتحول Pro ← المولّد "غير محدود".
- [ ] إلغاء الاشتراك ← يبقى Pro حتى نهاية الفترة.
- [ ] المحاكي على آيفون/أندرويد/آيباد/لابتوب.
- [ ] صفحات الخصوصية والشروط يراجعها محامٍ.
