---
"@assistant-ui/store": patch
---

feat: hoist the viewport scroll math to the client entry. isViewportAtBottom, viewportOverflows, isUserScrollUp, and observeContentResize were vue-local; they now live on @assistant-ui/store/client so the svelte viewport consumes the same implementation.
