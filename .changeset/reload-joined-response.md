---
"@assistant-ui/ai-sdk": patch
---

fix: reloading or editing an assistant response that joins several AI SDK messages no longer sends or keeps any part of the old response, including with `joinStrategy: "none"`
