---
"@assistant-ui/react": patch
---

fix(react): ignore the Enter or Escape that ends an IME composition, so committing a conversion in Safari no longer sends the message, and cancelling one no longer cancels the run or stops read-aloud
