---
"assistant-ui": patch
---

`assistant-ui create` refuses a destination that is a symbolic link, and while it writes the project and when it cleans up after a failure it checks that the destination is still the directory it started with. If that directory was replaced, nothing more is written to or removed from it.
