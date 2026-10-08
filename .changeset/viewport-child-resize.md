---
"@assistant-ui/store": patch
"@assistant-ui/react": patch
---

the thread viewport follows content that grows without a DOM change (an expanding collapsible, a loading image, an autosizing textarea) and updates `isAtBottom` so the scroll-to-bottom button shows; the React viewport now shares `observeContentResize` with Vue and Svelte
