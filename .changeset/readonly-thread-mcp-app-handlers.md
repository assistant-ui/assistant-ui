---
"@assistant-ui/core": patch
---

fix: a readonly thread ignores mutations instead of throwing, so a stored conversation rendered through ReadonlyThreadProvider no longer breaks when a tool UI adds a result, answers an approval or submits feedback; reading external state still throws
