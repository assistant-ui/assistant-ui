---
"@assistant-ui/x-buildutils": patch
"@assistant-ui/react": patch
---

fix(x-buildutils): include local `types/` in `typeRoots` so x-buildutils itself can resolve its ambient `browser-process` types

feat(react): re-export `Unstable_DirectiveFormatter`, `Unstable_DirectiveSegment`, `Unstable_TriggerItem`, and `unstable_defaultDirectiveFormatter` from `@assistant-ui/core` so downstream packages don't need to depend on `@assistant-ui/core` directly
