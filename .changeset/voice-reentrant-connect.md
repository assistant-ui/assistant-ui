---
"@assistant-ui/core": patch
---

fix(core): keep one live voice session when a thread subscriber or an external store's `onVoiceTranscript` reconnects voice mid-transition, and leave a user transcript from the replaced session out of the new one
