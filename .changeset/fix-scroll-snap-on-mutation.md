---
"@assistant-ui/react": patch
---

fix(react): release auto-stick intent on user scroll-up; fix retina sub-pixel at-bottom detection

`useThreadViewportAutoScroll` had two related bugs surfaced together on Chrome macOS with a retina display (`devicePixelRatio: 2`):

1. **Subtree mutations snapped the viewport back to bottom after the user scrolled away.** `scrollingToBottomBehaviorRef` was planted on `thread.runStart` and only cleared in `handleScroll` once `newIsAtBottom` became true. If the user scrolled up before reaching bottom (or after streaming finished while still on the bottom), the ref stayed set and `useOnResizeContent` kept calling `scrollToBottom(scrollBehavior)` on every subtree mutation — markdown re-render, syntax-highlighting pass, image lazy-load, even an attribute flip on a child. The viewport was effectively locked to the bottom until a full reload.

2. **`isAtBottom` never registered as `true` on high-DPR displays.** `Math.abs(scrollHeight - scrollTop - clientHeight) < 1` is strict-less-than. Chrome macOS at `devicePixelRatio: 2` clips `scrollTop` one pixel short of `scrollHeight - clientHeight` (`Math.abs(1) < 1 === false`), so even visually at the bottom the store never updated and `ScrollToBottom` never moved into its disabled state.

The fix tracks `lastScrollHeight` alongside `lastScrollTop` so the scroll handler can distinguish a user-initiated scroll-up from a content-driven scrollTop adjustment (scrollHeight grew/shrank under it). When the user actually scrolls up and content size is unchanged, the auto-stick intent is released. The threshold becomes `<= 1` to absorb the 1px sub-pixel clip.

`thread.runStart` → at-bottom auto-follow during streaming is preserved (verified by appending a synthetic 600px child while scrolled to bottom — viewport follows to new bottom). User scrolling up no longer fights back, and the `ScrollToBottom` button now correctly hides at the bottom on retina displays.
