---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/ai-sdk": patch
---

Add an opt-in Resume control for interrupted runs. An adapter that keeps an exact checkpoint sets `canResume`, and `useComposerResume` from `@assistant-ui/core/react` or `ComposerPrimitive.Resume` resumes it through `resumeRun`; the control is disabled while the draft is not empty or the thread is busy, and concurrent resumes share one attempt. `canResume` is optional on thread state, so existing custom thread clients remain compatible. The AI SDK runtime offers Resume only while resumable storage holds a pending stream, and the server must replay the interrupted message with its original ID.
