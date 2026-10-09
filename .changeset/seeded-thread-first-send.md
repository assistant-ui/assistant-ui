---
"@assistant-ui/core": patch
---

fix(core): keep a thread seeded with `initialMessages` local until its first send or run, so a remote thread list no longer creates an empty remote thread and requests its title on mount
