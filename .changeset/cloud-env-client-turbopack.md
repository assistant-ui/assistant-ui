---
"@assistant-ui/core": patch
---

fix: the anonymous cloud client picks up `NEXT_PUBLIC_ASSISTANT_BASE_URL` in Next.js production builds made with Turbopack, where the browser fell back to an in-memory thread list
