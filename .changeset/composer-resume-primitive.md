---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

Add a Resume control for interrupted runs. `useComposerResume` from `@assistant-ui/core/react` and `ComposerPrimitive.Resume` resume a run whose adapter reports `canResume`; the control is disabled while the draft is not empty or the thread is busy.
