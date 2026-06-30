---
"@assistant-ui/react": patch
---

Thread list accessibility improvements, focused on keyboard and focus handling:

- Arrow-key navigation: Up/Down between items, Right to an item's "More" button
  (mirrored in RTL); every item stays a Tab stop.
- Continuous focus: opening and closing a menu keeps focus on the row, so the
  focus-visible highlight never breaks.
- New `sharedFocusGroup` on `ThreadListItemMorePrimitive.Root` extends this to the
  menu (Right opens, Left/Escape close and restore focus) and forces it non-modal;
  without it, menus are unchanged.
