---
"assistant-cloud": patch
---

Create a message's failed parent again before the message, so a reply to a message whose create failed keeps its place in the thread; a reply whose parent still cannot be created is stored as a root.
