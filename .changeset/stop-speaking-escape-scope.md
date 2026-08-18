---
"@assistant-ui/react": patch
---

fix: keep Escape-to-stop-speaking active when message action bars are hidden by moving the shortcut to `ThreadPrimitive.Root`; custom compositions must mount the root to enable it
