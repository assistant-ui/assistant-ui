---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

feat: add `uploadBackendDefaults` option to `Tools` so apps without their own backend (e.g. cloud-hosted runs) can upload the full specs of `"use generative"` frontend/human tools and generative UI components instead of assuming the backend already knows them
