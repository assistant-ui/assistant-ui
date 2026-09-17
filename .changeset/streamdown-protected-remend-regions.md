---
"@assistant-ui/react-streamdown": patch
---

fix: preserve tildes inside indented code, nested fences and display math

Custom remend handlers now run once per prose segment around protected blocks, and completion markers move across the separator only when the handler preserves the built-in repaired prefix.
