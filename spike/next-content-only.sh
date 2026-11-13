#!/bin/sh
# Trims apps/docs/app to the content routes only (docs, docs sites, elements,
# design components, blog, careers, examples) for a scope-matched Next build.
# Restore with: git -C apps/docs checkout -- app && git -C apps/docs clean -fd app
set -e
cd "$(dirname "$0")/../apps/docs/app"
KEEP='^\./\(docs\)/docs/\[\[\.\.\.slug\]\]/page\.tsx$|^\./\(docs-sites\)/\[site\]/docs/\[\[\.\.\.slug\]\]/page\.tsx$|^\./\(catalog\)/elements/\(detail\)/\[slug\]/page\.tsx$|^\./\(design\)/design/components/\[slug\]/page\.tsx$|^\./\(home\)/(blog|careers|examples)/\[slug\]/page\.tsx$'
find . \( -name 'page.tsx' -o -name 'page.ts' -o -name 'route.ts' -o -name 'route.tsx' \) | grep -Ev "$KEEP" | while read f; do rm "$f"; done
rm -f sitemap.ts robots.ts manifest.ts
# withDocs regenerates a cacheComponents-incompatible api/docs route when it is missing; element-source imports it.
git checkout -- api/docs/route.ts
# lib/ type-imports these two routes, so the build typecheck needs them.
git checkout -- api/demo/usage/route.ts api/auth/session/route.ts
find . \( -name 'page.tsx' -o -name 'route.ts' \) | sort
