---
"@assistant-ui/react": patch
---

fix: ExternalThread edit composer reads editing state live, so a same-tick beginEdit + setText + send dispatches the edit; send before beginEdit and double beginEdit now throw (legacy runtime parity)
