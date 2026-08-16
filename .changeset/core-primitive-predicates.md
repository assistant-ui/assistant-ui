---
"@assistant-ui/core": patch
---

feat: shared disabled predicates for the primitive layer on @assistant-ui/core/store/internal. the composer, action bar, branch picker, and suggestion disabled selectors previously lived as verbatim copies in each binding's hooks; they are now named exports (composerSendDisabled and friends) consumed by the react hooks and the vue and svelte bridges alike, so disabled semantics cannot drift between frameworks.
