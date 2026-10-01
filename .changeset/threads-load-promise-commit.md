---
"@assistant-ui/core": patch
---

fix(core): resolve `aui.threads.getLoadThreadsPromise()`, `reload()` and `loadMore()` once `getState()` reports the loaded list, or after 100ms if the client can't commit, as inside the `act()` that completes the load in a test or under a Suspense boundary that hides the client. In tests, await these promises outside that `act()` to read the loaded list.
