---
"@assistant-ui/core": patch
---

fix: drop a synthesized error message from the thread once the host's messages no longer carry it, so a reload or a new message after a failed request no longer leaves the error behind as a sibling branch
