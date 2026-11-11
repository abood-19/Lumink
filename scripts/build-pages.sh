#!/bin/bash
# Builds the whole site as static pages for GitHub Pages (https://<user>.github.io/Lumink/).
# One build per language: Russian at the root, /en/, /uz/, /ar/.
# Sign-in, payments and AI generation need the server version (Vercel); here they show demo mode.
set -e
REPO="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${PAGES_BASE:-/Lumink}"
WORK="${WORK:-/tmp/lumink-pages}"
OUT="$WORK/site"
rm -rf "$WORK"; mkdir -p "$WORK/src" "$OUT"
cd "$REPO"
tar --exclude=./node_modules --exclude=./.next --exclude=./.git --exclude=./out -cf - package.json package-lock.json tsconfig.json postcss.config.mjs next.config.ts src public | (cd "$WORK/src" && tar -xf -)
ln -s "${NODE_MODULES:-$REPO/node_modules}" "$WORK/src/node_modules"
cd "$WORK/src"
# server-only parts are not part of a static site
rm -rf src/app/api src/app/auth src/middleware.ts
grep -rl 'export const dynamic = "force-dynamic";' src | xargs -r sed -i '/export const dynamic = "force-dynamic";/d'
cat > src/lib/i18n/server.ts <<'TS'
import { DEFAULT_LOCALE, isLocale, type Locale } from "./index";
export async function getLocale(): Promise<Locale> {
  const l = process.env.LUMINK_LOCALE;
  return isLocale(l) ? l : DEFAULT_LOCALE;
}
TS
# the billing page reads ?plan= on the server; statically there is no query
sed -i 's/{ searchParams }: { searchParams: Promise<{ plan?: string; paid?: string }> }/_p: { searchParams?: Promise<{ plan?: string; paid?: string }> }/; s/const sp = await searchParams;/const sp: { plan?: string; paid?: string } = {};/' src/app/studio/billing/page.tsx
# switching language opens that language's copy of the same page
python3 - <<'PY'
p='src/lib/i18n/client.tsx'; s=open(p).read()
s=s.replace('''    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();''','''    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
    void router;
    const root = process.env.NEXT_PUBLIC_PAGES_ROOT || "";
    let path = location.pathname.slice(root.length);
    const m = path.match(/^\\/(en|uz|ar)(?=\\/|$)/); if (m) path = path.slice(m[0].length);
    location.href = root + (locale === "ru" ? "" : "/" + locale) + (path || "/");''')
open(p,'w').write(s)
p='src/components/RegisterSW.tsx'; s=open(p).read()
s=s.replace('navigator.serviceWorker.register("/sw.js").catch(() => {});','navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});')
open(p,'w').write(s)
PY
build() { # $1 locale, $2 basePath, $3 target dir
  cat > next.config.ts <<TS
import type { NextConfig } from "next";
const nextConfig: NextConfig = { output: "export", trailingSlash: true, basePath: "$2", images: { unoptimized: true }, eslint: { ignoreDuringBuilds: true }, typescript: { ignoreBuildErrors: true } };
export default nextConfig;
TS
  rm -rf .next out
  LUMINK_LOCALE=$1 NEXT_PUBLIC_PAGES_ROOT="$BASE" npx next build > "$WORK/build-$1.log" 2>&1 || { tail -30 "$WORK/build-$1.log"; exit 1; }
  mkdir -p "$3"; cp -r out/. "$3/"
  echo "built $1 -> $3"
}
build ru "$BASE" "$OUT"
for l in en uz ar; do build $l "$BASE/$l" "$OUT/$l"; done
# public files live once, at the root; point every page at them
python3 - "$OUT" "$BASE" <<'PY'
import os, re, sys, shutil
out, base = sys.argv[1], sys.argv[2]
pub = [n for n in os.listdir(out) if n in os.listdir(os.environ.get('PUBDIR', 'public'))]
pubdir = os.environ.get('PUBDIR', 'public')
for l in ('en','uz','ar'):
  for n in pub:
    p = os.path.join(out, l, n)
    if os.path.isfile(p): os.remove(p)
    elif os.path.isdir(p):
      # a folder can be both a page (artists/index.html) and public images: keep the page
      for root, _, fs in os.walk(os.path.join(pubdir, n)):
        for f in fs:
          q = os.path.join(out, l, os.path.relpath(os.path.join(root, f), pubdir))
          if os.path.exists(q): os.remove(q)
      for root, ds, fs in sorted(os.walk(p), key=lambda x: -len(x[0])):
        if not os.listdir(root): os.rmdir(root)
dirs = [n for n in pub if os.path.isdir(os.path.join(out, n))]
files = [n for n in pub if os.path.isfile(os.path.join(out, n))]
alt = '|'.join(re.escape(d) + '/' for d in dirs) + ('|' if dirs and files else '') + '|'.join(re.escape(f) + r'(?=["\'`)\s?#\\])' for f in files)
rx = re.compile(r'(["\'`(]|\\")/(' + alt + ')')
n = 0
for root, _, fs in os.walk(out):
  for f in fs:
    if not f.endswith(('.html', '.js', '.css', '.txt', '.json')): continue
    p = os.path.join(root, f)
    s = open(p, encoding='utf-8', errors='ignore').read()
    s2 = rx.sub(lambda m: m.group(1) + base + '/' + m.group(2), s)
    if s2 != s: open(p, 'w', encoding='utf-8').write(s2); n += 1
print('rewrote asset paths in', n, 'files')
PY
touch "$OUT/.nojekyll"
echo "done: $OUT"
