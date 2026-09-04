---
"@assistant-ui/react": patch
---

fix(react): keep the page from shifting sideways when a collapsible opens

`useScrollLock` hides the scrollbar for the length of the animation and pads the scroll container to keep its width, but it measured the scrollbar with `offsetWidth - clientWidth`. The root element's `offsetWidth` already excludes the viewport scrollbar, so that reported zero whenever the page itself was the scroller, no padding was added, and every centered element jumped sideways as the collapsible opened and back as it closed. The root now measures against `innerWidth` instead.
