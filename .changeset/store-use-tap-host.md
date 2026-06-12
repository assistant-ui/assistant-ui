---
"@assistant-ui/store": patch
---

feat: host the assistant client with useTapHost so the tap commit runs in the passive phase (no paint blocking); AuiProvider mounts the host's commit effects ahead of its children's effects
