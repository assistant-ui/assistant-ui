---
"@assistant-ui/react-ink": patch
---

fix: allow useNotification in standalone thread scopes without a thread-list item. Custom notification callbacks receive "unknown" as the thread ID when no thread-list item is available.
