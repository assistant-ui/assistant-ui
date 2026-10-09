---
"@assistant-ui/react": patch
"@assistant-ui/store": patch
---

Keep thread viewport observers stable and preserve scheduled scroll behavior. The React viewport reports at-bottom as soon as a scroll to bottom is requested, which the stable observers would otherwise publish late.
