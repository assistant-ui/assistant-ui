---
"@assistant-ui/react": patch
---

fix: ExternalThread edit composer reads editing state live, so a same-tick beginEdit + setText + send dispatches the edit
