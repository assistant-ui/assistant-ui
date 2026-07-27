---
"@assistant-ui/core": patch
---

fix: skip trailing empty text/reasoning parts when deriving part status, so a placeholder `text("")` an adapter appended before its content arrived no longer marks every earlier part complete the moment it appears
