---
"@assistant-ui/react": patch
---

fix(react): stop subtree mutations from snapping a scrolled-up viewport back to bottom; loosen at-bottom threshold for high-DPR displays

`useThreadViewportAutoScroll` had two related bugs surfaced on Chrome macOS at `devicePixelRatio: 2`:

1. subtree mutations snapped the viewport back to bottom after the user scrolled away. `scrollingToBottomBehaviorRef` was planted on `thread.runStart` / `useOnScrollToBottom` / initialize / thread switch and only cleared in `handleScroll` once `newIsAtBottom` became true. while the ref stayed set, every non-style subtree mutation (a Radix `data-state` flip, a markdown re-render, an image lazy-load, an attribute toggle on a child) re-entered `useOnResizeContent`'s callback and called `scrollToBottom(scrollBehavior)`, locking the viewport to the bottom until reload.

2. `isAtBottom` never registered as `true` on high-DPR displays. `Math.abs(scrollHeight - scrollTop - clientHeight) < 1` is strict-less-than, and Chrome macOS at `devicePixelRatio: 2` clips `scrollTop` one pixel short of `scrollHeight - clientHeight` (`Math.abs(1) < 1 === false`), so the store never updated and `ScrollToBottom` never moved into its disabled state.

the fix combines two layers. `handleScroll` now tracks `lastScrollHeight` alongside `lastScrollTop` and releases the auto-stick intent when the user scrolls up with content size unchanged, ruling out content-driven scrollTop shifts. the resize callback also bails when neither `scrollHeight` nor `clientHeight` has changed since the last fire, so mutations that don't move layout never re-enter the snap path. at-bottom auto-follow during streaming is preserved (verified by appending a synthetic 600px child while scrolled to bottom; viewport follows to new bottom). the threshold becomes `<= 1` to absorb the 1px sub-pixel clip.

closes #4140.
