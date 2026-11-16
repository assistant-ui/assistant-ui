---
"@assistant-ui/variants": patch
---

fix: the Next.js route handlers now check the client address like the Vite plugin, and refuse requests whose address is unknown unless `allowRemoteClients` is set.
