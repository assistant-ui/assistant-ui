---
"@assistant-ui/core": patch
"@assistant-ui/ai-sdk": patch
---

Add an opt-in `canResume` flag for interrupted runs. An adapter that keeps an exact checkpoint sets `canResume`, and `resumeRun` resumes it; concurrent resumes share one attempt. `canResume` is optional on thread state, so existing custom thread clients remain compatible. The AI SDK runtime offers it only while resumable storage holds a pending stream, and the server must replay the interrupted message with its original ID.
