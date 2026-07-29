---
"@assistant-ui/store": patch
---

refactor: evaluate Derived scopes at React level; useAui's tap root hosts only build scopes, so Derived-only mounts no longer re-render a tap root per update
