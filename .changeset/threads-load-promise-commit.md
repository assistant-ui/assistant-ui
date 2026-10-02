---
"@assistant-ui/core": patch
---

fix(core): resolve `aui.threads.getLoadThreadsPromise()`, `reload()` and `loadMore()` once `getState()` reports the result: the loaded list, or `loadError` when the initial load or `reload()` fails. A failed `loadMore()` request is logged and its promise still resolves. If the client can't commit within 100ms, as inside the `act()` that completes the load in a test or under a Suspense boundary that hides the client, the promises resolve anyway. In tests, await them outside that `act()` to read the loaded list.
