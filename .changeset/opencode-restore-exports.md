---
"@assistant-ui/react-opencode": patch
---

fix: restore the type exports that the previous refactor trimmed from the public barrel; removing a shipped export is a breaking change for npm consumers, even when no in-repo consumer imports it
