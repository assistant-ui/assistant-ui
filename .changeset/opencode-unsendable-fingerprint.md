---
"@assistant-ui/react-opencode": patch
---

fix: stop fingerprinting audio and data parts the outbound path never sends, so their pending copies reconcile with the server echo
