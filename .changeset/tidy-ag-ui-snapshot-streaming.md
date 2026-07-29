---
"@assistant-ui/react-ag-ui": patch
---

fix: keep streaming across mid-run MESSAGES_SNAPSHOT imports. The active assistant is preserved and re-anchored when the snapshot omits it, and when a snapshot shape still evicts it, the placeholder is recreated under its original id on the next content-bearing emit, so neither the token stream nor the message identity is lost.
