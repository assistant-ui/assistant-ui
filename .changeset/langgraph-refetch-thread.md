---
"@assistant-ui/react-langgraph": patch
---

feat: register `onRefetchThread`, so `threads.reloadMainThread()` refetches in place instead of remounting the runtime hook. The load effect body moves into a shared `runLoad(purpose)` with one `AbortController` per in-flight load, and a refetch goes through the same load boundary the initial load already uses, so it merges into whatever a run has produced since rather than replacing it. A run in progress is left alone: it is neither cancelled nor reset, because the merge already decides what each side keeps. A refetch that arrives while the initial load is still in flight defers to it, a new run supersedes an in-flight refetch, and one still in flight at unmount is aborted.
