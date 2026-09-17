---
"@assistant-ui/react-streamdown": patch
---

fix: preserve tildes inside indented code, nested fences and display math

Custom remend handlers now run once per prose segment around protected blocks, and their output remains authoritative instead of relocating completion markers.
