---
"generative-frame": patch
---

feat(generative-frame): let a widget ask the host to copy text with `genframe.copyText(text)` or `navigator.clipboard.writeText(text)`, which reaches the new `onCopyText` handler; without one, copying fails in the widget
