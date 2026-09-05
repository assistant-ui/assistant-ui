---
"@assistant-ui/react": patch
---

fix(react): keep the page from shifting sideways when a collapsible opens

`useScrollLock` hides the scrollbar for the length of the animation and pads the scroll container to keep its width, but it measured the bar as `offsetWidth - clientWidth` minus borders. A root element's `offsetWidth` already excludes the viewport scrollbar, so that reported zero whenever the scroll had propagated to the viewport, no padding was added, and every centered element jumped sideways as the collapsible opened and back as it closed. A root scroller now falls back to measuring against `innerWidth`, but only when the element formula reports nothing, so a body that scrolls in its own right is still padded by its own gutter.
