---
"@assistant-ui/core": patch
---

feat: accept `providerMetadata` on image and file message parts, the channel text, reasoning and source parts already carry. A runtime adapter reads its own namespace off it, so a part can carry provider-specific data (an upload id, a document handle) without a field per provider.
