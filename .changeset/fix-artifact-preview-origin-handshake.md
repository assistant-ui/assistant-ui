---
"@assistant-ui/react": patch
---

fix: `ArtifactPrimitive.Preview` now posts an origin handshake into the artifact iframe so the
runtime can target its status `postMessage` even when the content document has no `?origin=`
query string.
