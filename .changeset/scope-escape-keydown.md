---
"@assistant-ui/react": patch
---

Fix ESC keydown handler to only trigger when event originates from the composer input

The `useEscapeKeydown` hook was intercepting ESC key events globally, preventing other UI elements (like Radix dialogs) from responding to ESC. The handler now checks if the event target is within the composer input before calling `preventDefault()`.
