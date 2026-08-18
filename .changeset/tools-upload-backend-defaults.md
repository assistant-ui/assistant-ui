---
"@assistant-ui/x-generative-compiler": patch
"@assistant-ui/vite": patch
"@assistant-ui/next": patch
"@assistant-ui/metro": patch
---

feat: add a `backendless` compile option for apps without their own backend (e.g. cloud-hosted runs), keeping `"use generative"` frontend/human tool schemas and `JSONGenerativeUI` component-library schemas uploadable from the client instead of assuming the backend already knows them
