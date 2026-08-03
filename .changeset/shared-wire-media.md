---
"@assistant-ui/core": patch
"@assistant-ui/react-ai-sdk": patch
"@assistant-ui/react-opencode": patch
---

refactor: share the media type ladder and wire url between adapters

`resolveImageMediaType`, `resolveFileMediaType` and `toMediaWireUrl` join the data URL helpers in `@assistant-ui/core/internal`. react-ai-sdk and react-opencode had arrived at identical ladders and an identical wire url builder by construction rather than by sharing code, and they had already drifted apart twice while getting there. Both now call the shared functions and keep only their own part-shape plumbing.

No behavior change: both adapters' existing suites pass untouched.
